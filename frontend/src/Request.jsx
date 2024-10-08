import React, { useState, useEffect } from "react";

const Request = ({ request, handleUpdateStatus, socket }) => {
  const [status, setStatus] = useState(request.status);

  useEffect(() => {
    socket.on("statusUpdate", (updatedRequest) => {
      if (updatedRequest.id === request.id) {
        setStatus(updatedRequest.status);
      }
    });

    return () => {
      socket.off("statusUpdate");
    };
  }, [request.id, socket]);

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    handleUpdateStatus(request.id, newStatus);
    socket.emit("statusUpdate", { id: request.id, status: newStatus });
  };

  return (
    <li>
      {request.title} - {status}
      <select value={status} onChange={handleStatusChange}>
        <option value="pending">Pending</option>
        <option value="in progress">In Progress</option>
        <option value="resolved">Resolved</option>
      </select>
    </li>
  );
};

export default Request;
