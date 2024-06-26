import { Request, Response } from "express";
import Order from "./models/order.js";
import axios from "axios";
import { IS_LOCAL } from "./const.js";
import { config } from "./config.js";

const EVENTS_SERVICE_URL = IS_LOCAL
  ? "http://localhost:3001"
  : "https://events-system-event.onrender.com";

const API_KEY = process.env.API_KEY || config.API_KEY;

export async function wakeUpOrderRoute(req: Request, res: Response) {
  console.log("Waking up...");

  res.status(200).send("Order server is awake");
}

export const getUserOrdersRoute = async (req: Request, res: Response) => {
  const username = req.params.username;

  try {
    const orders = await Order.find({ username: username }).lean();

    const ordersWithEvents = await Promise.all(
      orders.map(async (order) => {
        const eventResponse = await axios.get(
          `${EVENTS_SERVICE_URL}/api/event/${order.event_id}`,
          {
            headers: {
              Authorization: `Bearer ${API_KEY}`,
            },
          }
        );
        const event = eventResponse.data;
        delete event._id;
        const { checkout_date, ticket_type, quantity, username } = order;
        const trimOrder = { checkout_date, ticket_type, quantity, username };
        const orderWithEvent = { ...trimOrder, event };
        return orderWithEvent;
      })
    );

    res.status(200).json(ordersWithEvents);
  } catch (error) {
    console.log("Error fetching orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createOrderRoute = async (req: Request, res: Response) => {
  const { order_id, checkout_date, ticket_type, quantity, event_id, username } =
    req.body;

  try {
    const newOrder = new Order({
      _id: order_id,
      checkout_date,
      ticket_type,
      quantity,
      event_id,
      username,
    });

    await newOrder.save();

    res.status(201).json(newOrder);
  } catch (error) {
    console.log("Error creating order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUsersByEventRoute = async (req: Request, res: Response) => {
  const eventId = req.params.eventId;

  try {
    const orders = await Order.find({ event_id: eventId });

    const username = orders.map((order) => order.username);

    const uniqueUsernames = Array.from(new Set(username));

    res.status(200).json(uniqueUsernames);
  } catch (error) {
    console.log("Error fetching user IDs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getEventsByUserRoute = async (req: Request, res: Response) => {
  const username = req.params.username;

  try {
    const orders = await Order.find({ username: username });

    const events = orders.map((order) => order.event_id);

    const uniqueEvents = Array.from(new Set(events));

    res.status(200).json(uniqueEvents);
  } catch (error) {
    console.log("Error fetching user IDs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserNextEventRoute = async (req: Request, res: Response) => {
  const username = req.params.username;
  try {
    let results = [];
    results = await Order.find({ username });
    let events = results.map((result) => result.event_id);
    const userEvents = await Promise.all(
      events.map(async (eventId) => {
        const event = await axios.get(
          `${EVENTS_SERVICE_URL}/api/event/${eventId}`,
          {
            headers: {
              Authorization: `Bearer ${API_KEY}`,
            },
          }
        );
        return event.data;
      })
    );

    const filteredEvents = userEvents.filter((event) => {
      return new Date(event.start_date) > new Date();
    });

    let earliestEvent = {};
    if (filteredEvents.length > 0) {
      earliestEvent = filteredEvents.reduce((prev, current) =>
        new Date(prev.start_date) < new Date(current.start_date)
          ? prev
          : current
      );
    }
    res.status(200).json(earliestEvent);
  } catch (e) {
    console.log("Error fetching user next event:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};
