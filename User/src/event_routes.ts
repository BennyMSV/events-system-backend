import { Request, Response } from "express";
import axios from "axios";
import { verifyToken, getUserFromCookie } from "./helper_func.js";
import { EVENT_SERVER_URL, IS_LOCAL } from "./consts.js";
import { config } from "./config.js";

const EVENT_SERVICE_URL = IS_LOCAL ? "http://localhost:3001" : EVENT_SERVER_URL;

export const getEventRoute = async (req: Request, res: Response) => {
  if (!verifyToken(req, res)) {
    res.status(401).send("Not logged in");
    return;
  }
  try {
    const eventId = req.params.id;
    const response = await axios.get(
      `${EVENT_SERVICE_URL}/api/event/${eventId}`,
      config.API_KEY_HEADER
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllEventsRoute = async (req: Request, res: Response) => {
  if (!verifyToken(req, res)) {
    res.status(401).send("Not logged in");
    return;
  }

  let { page } = req.query;

  if (page) {
    page = !isNaN(parseInt(page as string, 10))
      ? parseInt(page as string, 10)
      : 1;
  } else {
    page = 1;
  }

  try {
    const response = await axios.get(
      `${EVENT_SERVICE_URL}/api/event?page=${page}`,
      config.API_KEY_HEADER
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createEventRoute = async (req: Request, res: Response) => {
  if (!verifyToken(req, res)) {
    res.status(401).send("Not logged in");
    return;
  }
  try {
    const user = await getUserFromCookie(req);

    if (user.permission !== "A" && user.permission !== "M") {
      res.status(403).send("Permission denied");
      return;
    }
    const eventData = req.body;
    const response = await axios.post(
      `${EVENT_SERVICE_URL}/api/event`,
      eventData,
      config.API_KEY_HEADER
    );

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateEventDateRoute = async (req: Request, res: Response) => {
  if (!verifyToken(req, res)) {
    res.status(401).send("Not logged in");
    return;
  }
  try {
    const eventId = req.params.id;

    const { start_date, end_date } = req.body;

    if (!start_date && !end_date) {
      res.status(200).send("Empty Update");
      return;
    }

    const eventData = {};
    if (start_date) {
      eventData["start_date"] = start_date;
    }
    if (end_date) {
      eventData["end_date"] = end_date;
    }

    const response = await axios.put(
      `${EVENT_SERVICE_URL}/api/event/${eventId}/date`,
      eventData,
      config.API_KEY_HEADER
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error updating event dates:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateTicketRoute = async (req: Request, res: Response) => {
  if (!verifyToken(req, res)) {
    res.status(401).send("Not logged in");
    return;
  }
  try {
    const eventId = req.params.id;

    const { ticket_type, quantity } = req.body;

    if (!ticket_type || !quantity) {
      res.status(400).send("Both ticket_type and quantity must be provided");
      return;
    }

    const response = await axios.put(
      `${EVENT_SERVICE_URL}/api/event/${eventId}/ticket`,
      {
        ticket_type,
        quantity,
      },
      config.API_KEY_HEADER
    );

    res.json(response.data);
  } catch (error) {
    if (error.response.status === 400) {
      return res
        .status(400)
        .json({ error: "Ticket quantity cannot go below 0" });
    }
    console.error("Error updating ticket quantity:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const lockTicketRoute = async (req: Request, res: Response) => {
  if (!verifyToken(req, res)) {
    res.status(401).send("Not logged in");
    return;
  }
  try {
    const lockData = req.body;
    const user = await getUserFromCookie(req);
    lockData["username"] = user.username;
    const response = await axios.post(
      `${EVENT_SERVICE_URL}/api/event/lock`,
      lockData,
      config.API_KEY_HEADER
    );

    res.status(201).json(response.data);
  } catch (error) {
    if (error.response.status === 400) {
      return res.status(400).json({ error: "Not enough tickets available" });
    }
    console.log("Error locking ticket:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const unlockTicketRoute = async (req: Request, res: Response) => {
  if (!verifyToken(req, res)) {
    res.status(401).send("Not logged in");
    return;
  }
  try {
    const { lock_id, event_id, type, quantity } = req.body;
    const unlockData = { lock_id, event_id, type, quantity };
    await axios.post(
      `${EVENT_SERVICE_URL}/api/event/unlock`,
      unlockData,
      config.API_KEY_HEADER
    );
    res.status(200).json({ message: "Ticket unlocked or already expired" });
  } catch (error) {
    if (error.response.status === 400) {
      return res.status(400).json({ error: "Not enough tickets available" });
    }
    console.log("Error unlocking ticket:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
