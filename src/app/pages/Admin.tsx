import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { db } from "../lib/firebase";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    where,
} from "firebase/firestore";

type TicketCategory = "donation" | "report" | "ban_appeal" | "support";
type TicketStatus = "open" | "in_progress" | "closed";

interface Ticket {
    id: string;
    category: TicketCategory;
    subject: string;
    message: string;
    imageUrl?: string;
    status: TicketStatus;
    createdAt: any;
    username: string;
    discordId: string;
    donationAmount?: string;
    reportedUser?: string;
    banReason?: string;
}

interface Reply {
    id: string;
    message: string;
    authorId: string;
    authorName: string;
    authorRole: "user" | "staff";
    createdAt: any;
}

const CATEGORIES: Record<
    TicketCategory,
    { label: string; icon: string; badge: string }
> = {
    donation: {
        label: "Donation",
        icon: "💎",
        badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    },
    report: {
        label: "Report",
        icon: "⚠️",
        badge: "bg-red-500/15 text-red-300 border-red-500/30",
    },
    ban_appeal: {
        label: "Ban Appeal",
        icon: "🔓",
        badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    },
    support: {
        label: "Support",
        icon: "🛠️",
        badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    },
};

const STATUS_STYLES: Record<TicketStatus, string> = {
    open: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
    in_progress: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    closed: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30",
};

export default function Admin() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | TicketStatus>("all");
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [repliesLoading, setRepliesLoading] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [sending, setSending] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // All tickets (staff sees everything)
    useEffect(() => {
        const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));

        const unsub = onSnapshot(
            q,
            (snap) => {
                const list: Ticket[] = snap.docs.map((d) => ({
                    id: d.id,
                    ...(d.data() as Omit<Ticket, "id">),
                }));
                setTickets(list);
                setLoading(false);
            },
            (err) => {
                console.error(err);
                setLoading(false);
            }
        );

        return () => unsub();
    }, []);

    // Replies for selected ticket
    useEffect(() => {
        if (!activeTicket) {
            setReplies([]);
            return;
        }

        setRepliesLoading(true);
        const q = query(
            collection(db, "tickets", activeTicket.id, "replies"),
            orderBy("createdAt", "asc")
        );

        const unsub = onSnapshot(
            q,
            (snap) => {
                setReplies(
                    snap.docs.map((d) => ({
                        id: d.id,
                        ...(d.data() as Omit<Reply, "id">),
                    }))
                );
                setRepliesLoading(false);
            },
            () => setRepliesLoading(false)
        );

        return () => unsub();
    }, [activeTicket?.id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [replies, activeTicket]);

    const filtered =
        filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

    const counts = {
        all: tickets.length,
        open: tickets.filter((t) => t.status === "open").length,
        in_progress: tickets.filter((t) => t.status === "in_progress").length,
        closed: tickets.filter((t) => t.status === "closed").length,
    };

    const updateStatus = async (status: TicketStatus) => {
        if (!activeTicket) return;
        try {
            await updateDoc(doc(db, "tickets", activeTicket.id), { status });
            setActiveTicket({ ...activeTicket, status });
        } catch (err) {
            console.error(err);
            alert("Failed to update status");
        }
    };

    const sendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !activeTicket || !replyText.trim()) return;

        setSending(true);
        try {
            await addDoc(collection(db, "tickets", activeTicket.id, "replies"), {
                message: replyText.trim(),
                authorId: String(user.id),
                authorName: user.username,
                authorRole: "staff",
                createdAt: serverTimestamp(),
            });

            // Auto-set to in_progress if still open
            if (activeTicket.status === "open") {
                await updateDoc(doc(db, "tickets", activeTicket.id), {
                    status: "in_progress",
                });
                setActiveTicket({ ...activeTicket, status: "in_progress" });
            }

            setReplyText("");
        } catch (err: any) {
            console.error("Reply error:", err);
            alert(`Failed to send reply:\n${err?.message || err?.code || JSON.stringify(err)}`);
        }
    };

    // ── CHAT VIEW ──
    if (activeTicket) {
        const cat = CATEGORIES[activeTicket.category];

        return (
            <div className="container-nrp py-8 max-w-3xl">
                <button
                    onClick={() => setActiveTicket(null)}
                    className="mb-4 text-sm text-zinc-500 hover:text-zinc-300 transition"
                >
                    ← Back to all tickets
                </button>

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-white">{activeTicket.subject}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-zinc-600">
                            #{activeTicket.id.slice(0, 8)}
                        </span>
                        <span className={`badge ${STATUS_STYLES[activeTicket.status]}`}>
                            {activeTicket.status.replace("_", " ")}
                        </span>
                        {cat && (
                            <span className={`badge border ${cat.badge}`}>
                                {cat.icon} {cat.label}
                            </span>
                        )}
                        <span className="text-xs text-zinc-500">
                            by <span className="text-zinc-300">{activeTicket.username}</span>
                        </span>
                    </div>

                    {/* Status actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        {activeTicket.status !== "open" && (
                            <button
                                onClick={() => updateStatus("open")}
                                className="btn-ghost text-xs py-1.5 px-3 border border-zinc-700"
                            >
                                Mark Open
                            </button>
                        )}
                        {activeTicket.status !== "in_progress" && (
                            <button
                                onClick={() => updateStatus("in_progress")}
                                className="btn-ghost text-xs py-1.5 px-3 border border-zinc-700"
                            >
                                Mark In Progress
                            </button>
                        )}
                        {activeTicket.status !== "closed" && (
                            <button
                                onClick={() => updateStatus("closed")}
                                className="btn-ghost text-xs py-1.5 px-3 border border-red-500/30 text-red-400 hover:bg-red-500/10"
                            >
                                Close Ticket
                            </button>
                        )}
                    </div>
                </div>

                {/* Chat */}
                <div className="card flex flex-col" style={{ minHeight: "420px", maxHeight: "60vh" }}>
                    <div className="flex-1 space-y-4 overflow-y-auto p-5">
                        {/* Original message (from user) */}
                        <div className="flex justify-start">
                            <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-zinc-800 px-4 py-3 text-sm text-zinc-100">
                                <p className="mb-1 text-xs font-medium text-zinc-400">
                                    {activeTicket.username} · User
                                </p>
                                <p className="whitespace-pre-wrap">{activeTicket.message}</p>
                                {activeTicket.imageUrl && (
                                    <img
                                        src={activeTicket.imageUrl}
                                        alt=""
                                        className="mt-2 max-h-40 rounded-lg"
                                    />
                                )}
                                <p className="mt-1.5 text-[10px] text-zinc-500">
                                    {activeTicket.createdAt?.toDate
                                        ? activeTicket.createdAt.toDate().toLocaleString()
                                        : ""}
                                </p>
                            </div>
                        </div>

                        {/* Meta info */}
                        {(activeTicket.donationAmount ||
                            activeTicket.reportedUser ||
                            activeTicket.banReason) && (
                                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-400">
                                    {activeTicket.donationAmount && (
                                        <p>
                                            Amount:{" "}
                                            <span className="text-zinc-200">{activeTicket.donationAmount}</span>
                                        </p>
                                    )}
                                    {activeTicket.reportedUser && (
                                        <p>
                                            Reported:{" "}
                                            <span className="text-zinc-200">{activeTicket.reportedUser}</span>
                                        </p>
                                    )}
                                    {activeTicket.banReason && (
                                        <p>
                                            Ban reason:{" "}
                                            <span className="text-zinc-200">{activeTicket.banReason}</span>
                                        </p>
                                    )}
                                </div>
                            )}

                        {repliesLoading && (
                            <p className="text-center text-sm text-zinc-600">Loading...</p>
                        )}

                        {replies.map((r) => {
                            const isStaff = r.authorRole === "staff";
                            return (
                                <div
                                    key={r.id}
                                    className={`flex ${isStaff ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${isStaff
                                                ? "rounded-br-md bg-indigo-600 text-white"
                                                : "rounded-bl-md bg-zinc-800 text-zinc-100"
                                            }`}
                                    >
                                        <p
                                            className={`mb-1 text-xs font-medium ${isStaff ? "text-indigo-200" : "text-zinc-400"
                                                }`}
                                        >
                                            {r.authorName} · {isStaff ? "Staff" : "User"}
                                        </p>
                                        <p className="whitespace-pre-wrap">{r.message}</p>
                                        <p
                                            className={`mt-1.5 text-[10px] ${isStaff ? "text-right text-indigo-200" : "text-zinc-500"
                                                }`}
                                        >
                                            {r.createdAt?.toDate
                                                ? r.createdAt.toDate().toLocaleString()
                                                : ""}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Reply box */}
                    {activeTicket.status !== "closed" ? (
                        <form onSubmit={sendReply} className="flex gap-2 border-t border-zinc-800 p-4">
                            <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Reply as staff..."
                                className="input flex-1"
                                disabled={sending}
                            />
                            <button
                                type="submit"
                                disabled={sending || !replyText.trim()}
                                className="btn-primary px-5"
                            >
                                Send
                            </button>
                        </form>
                    ) : (
                        <div className="border-t border-zinc-800 px-4 py-3 text-center text-sm text-zinc-500">
                            Ticket is closed. Reopen it to reply.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── LIST VIEW ──
    return (
        <div className="container-nrp py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-white">Admin</h1>
                <p className="mt-1 text-zinc-400">Manage and respond to support tickets</p>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap gap-2">
                {(
                    [
                        ["all", "All"],
                        ["open", "Open"],
                        ["in_progress", "In Progress"],
                        ["closed", "Closed"],
                    ] as const
                ).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${filter === key
                                ? "bg-indigo-600 text-white"
                                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                            }`}
                    >
                        {label}
                        <span className="ml-1.5 text-xs opacity-70">
                            {counts[key]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Ticket list */}
            <div className="space-y-3">
                {loading ? (
                    <div className="card p-10 text-center text-zinc-500">Loading tickets...</div>
                ) : filtered.length === 0 ? (
                    <div className="card border-dashed p-12 text-center text-zinc-500">
                        No tickets in this filter.
                    </div>
                ) : (
                    filtered.map((ticket) => {
                        const cat = CATEGORIES[ticket.category];
                        return (
                            <button
                                key={ticket.id}
                                onClick={() => setActiveTicket(ticket)}
                                className="card w-full p-5 text-left transition hover:border-zinc-600 hover:bg-zinc-900/80"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-xs text-zinc-600">
                                                #{ticket.id.slice(0, 8)}
                                            </span>
                                            <span className={`badge ${STATUS_STYLES[ticket.status]}`}>
                                                {ticket.status.replace("_", " ")}
                                            </span>
                                            {cat && (
                                                <span className={`badge border ${cat.badge}`}>
                                                    {cat.icon} {cat.label}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-white">{ticket.subject}</h3>
                                        <p className="text-xs text-zinc-500">
                                            by <span className="text-zinc-300">{ticket.username}</span>
                                        </p>
                                    </div>
                                    <time className="text-xs text-zinc-600">
                                        {ticket.createdAt?.toDate
                                            ? ticket.createdAt.toDate().toLocaleString()
                                            : ""}
                                    </time>
                                </div>
                                <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                                    {ticket.message}
                                </p>
                                <p className="mt-3 text-xs text-indigo-400">Open & reply →</p>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}