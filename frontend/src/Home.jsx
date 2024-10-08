import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { useNavigate } from "react-router-dom";
import Logout from "./Logout";
import Request from "./Request";

const socket = io(`${import.meta.env.VITE_API_URL}`, {
  withCredentials: true,
});

const Home = () => {
  const [requests, setRequests] = useState([]);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("pending");
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/");
    }

    const fetchRequests = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/requests`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        setRequests(data.requests);
      } catch (error) {
        console.error("Error fetching requests:", error);
        alert("Failed to fetch requests");
      }
    };

    fetchRequests();

    socket.on("newRequest", (newRequest) => {
      setRequests((prevRequests) => [...prevRequests, newRequest]);
    });

    return () => {
      socket.off("newRequest");
    };
  }, [token, navigate]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, status }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      if (data.message === "Request created successfully") {
        setTitle("");
        setStatus("pending");
      } else {
        alert("Failed to create request");
      }
    } catch (error) {
      console.error("Error during request creation:", error);
      alert("Request creation failed");
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/request/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      if (data.message !== "Request status updated successfully") {
        alert("Failed to update request status");
      }
    } catch (error) {
      console.error("Error during request status update:", error);
      alert("Request status update failed");
    }
  };

  return (
    <div>
      <h2>Welcome, {username}!</h2>
      <Logout />
      {role !== "resolver" && (
        <form onSubmit={handleCreateRequest}>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="in progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <button type="submit">Create Request</button>
        </form>
      )}

      <ul>
        {requests.map((req) => (
          <Request
            key={req.id}
            request={req}
            handleUpdateStatus={handleUpdateStatus}
            socket={socket}
          />
        ))}
      </ul>
    </div>
  );
};

export default Home;
