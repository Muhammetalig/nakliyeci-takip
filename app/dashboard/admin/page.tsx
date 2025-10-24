"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/contexts/AuthContext";

const AdminPage: React.FC = () => {
	const router = useRouter();
	const { user, loading } = useAuth();

	useEffect(() => {
		if (!loading && !user) {
			router.replace('/login');
		}
	}, [user, loading, router]);

	if (loading || !user) {
		return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Yükleniyor...</div>;
	}

	return (
		<div style={{ minHeight: '100vh', padding: 24, background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
			<h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Admin Panel</h1>
			<p style={{ color: '#6b7280' }}>Buraya admin ile ilgili kısa özet ve kontroller gelecek.</p>
		</div>
	);
};

export default AdminPage;
