import cors from "cors";
import express from "express";
import filePath from "./filePath";
import { Client } from "pg";
import dotenv from "dotenv";

const app = express();
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
client.connect();

app.use(express.json());
app.use(cors());

const PORT_NUMBER = process.env.PORT ?? 4000;

app.get("/", (req, res) => {
  const pathToFile = filePath("../public/index.html");
  res.sendFile(pathToFile);
});

// GET /items
app.get("/items", async (req, res) => {
  const queryResult = await client.query("SELECT * from todo_items");
  const allToDos = queryResult.rows;
  res.status(200).json(allToDos);
});

// POST /items
app.post("/items", async (req, res) => {
  const postData = req.body;
  if (typeof postData.task === "string" && postData.task !== "") {
    const queryResult = await client.query(
      "INSERT INTO todo_items (task, duedate) VALUES ($1, $2)",
      [postData.task, postData.dueDate]
    );
    const signature = queryResult.rows[0];
    res.status(201).json({
      status: "success",
      data: signature,
    });
  } else {
    res.status(400).json({
      status: "fail",
      data: {
        name: "A string value for task is required in your JSON body",
      },
    });
  }
});

// GET /items/:id
app.get<{ id: string }>("/items/:id", async (req, res) => {
  const id = parseInt(req.params.id); // params are always string type

  const queryResult = await client.query(
    "SELECT * FROM todo_items WHERE id = $1",
    [id]
  ); //FIXME-TASK get the signature row from the db (match on id)

  const matchingSignature = queryResult.rows;
  if (!matchingSignature) {
    res.status(404).json(matchingSignature);
  } else {
    res.status(200).json(matchingSignature);
  }
});

// DELETE /items/:id
app.delete("/items/:id", async (req, res) => {
  const id = parseInt(req.params.id); // params are string type

  const queryResult = await client.query(
    "DELETE FROM todo_items WHERE id = $1",
    [id]
  ); ////FIXME-TASK: delete the row with given id from the db
  const didRemove = queryResult.rowCount === 1;

  if (didRemove) {
    res.status(200).json({
      status: "success",
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a signature with that id identifier",
      },
    });
  }
});

app.put("/items/:id", async (req, res) => {
  //  :id refers to a route parameter, which will be made available in req.params.id
  const toDoData = req.body;
  const id = parseInt(req.params.id);
  if (typeof toDoData.task === "string" && toDoData.task !== "") {
    let queryResult;
    if (toDoData.dueDate) {
      const values = [toDoData.task, toDoData.dueDate, id];
      queryResult = await client.query(
        "UPDATE todo_items SET task = $1, dueDate = $2 WHERE id = $3",
        values
      ); //FIXME-TASK: update the signature with given id in the DB.
    } else {
      const values = [toDoData.task, id];
      queryResult = await client.query(
        "UPDATE todo_items SET task = $1 WHERE id = $2",
        values
      );
    }

    if (queryResult.rowCount === 1) {
      const updatedTask = queryResult.rows[0];
      res.status(200).json({
        status: "success",
        data: {
          task: updatedTask,
        },
      });
    } else {
      res.status(404).json({
        status: "fail",
        data: {
          id: "Could not find a task with that id identifier",
        },
      });
    }
  } else {
    res.status(400).json({
      status: "fail",
      data: {
        name: "A string value for task is required in your JSON body",
      },
    });
  }
});

// Add functionality to complete a task or undo a completion
app.put("/items/:id/complete", async (req, res) => {
  const id = parseInt(req.params.id);
  const queryResult = await client.query(
    "UPDATE todo_items SET completed = NOT completed WHERE id = $1",
    [id]
  ); //FIXME-TASK: update the signature with given id in the DB.
  if (queryResult.rowCount === 1) {
    const updatedTask = queryResult.rows[0];
    res.status(200).json({
      status: "success",
      data: {
        task: updatedTask,
      },
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a task with that id identifier",
      },
    });
  }
});

app.listen(PORT_NUMBER, () => {
  console.log(`Server is listening on port ${PORT_NUMBER}!`);
});
