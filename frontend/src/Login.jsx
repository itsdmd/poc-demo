import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const navigate = useNavigate();

	const handleLogin = async (e) => {
		e.preventDefault();
		const response = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ username, password }),
		});
		const data = await response.json();
		if (data.message === "Login successful") {
			localStorage.setItem("user", JSON.stringify(data.user));
			navigate("/home");
		} else {
			alert("Invalid credentials");
		}
	};

	return (
		<form onSubmit={handleLogin}>
			<input
				type="text"
				placeholder="Username"
				value={username}
				onChange={(e) => setUsername(e.target.value)}
			/>
			<input
				type="password"
				placeholder="Password"
				value={password}
				onChange={(e) => setPassword(e.target.value)}
			/>
			<button type="submit">Login</button>
		</form>
	);
};

export default Login;
