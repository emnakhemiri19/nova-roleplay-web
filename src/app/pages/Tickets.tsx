import { useState, useRef, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { db, storage } from "../lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
  imageUrl?: string;
  createdAt: any;
}

interface DiscordMember {
  id: string;
  username: string;
  globalName: string;
  nickname: string | null;
  avatar: string | null;
}

const CATEGORIES = [
  {
    id: "donation" as TicketCategory,
    label: "Donation",
    description: "Questions about donations, rewards, or packages",
    icon: "💎",
    color: "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  {
    id: "report" as TicketCategory,
    label: "Report",
    description: "Report a player or rule violation",
    icon: "⚠️",
    color: "border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-red-300",
    badge: "bg-red-500/15 text-red-300 border-red-500/30",
  },
  {
    id: "ban_appeal" as TicketCategory,
    label: "Ban Appeal",
    description: "Appeal a ban or punishment",
    icon: "🔓",
    color: "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 text-amber-300",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  {
    id: "support" as TicketCategory,
    label: "Support Team",
    description: "General help, bugs, or other issues",
    icon: "🛠️",
    color: "border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-300",
    badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
];

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  closed: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30",
};

const API_URL = "http://localhost:4000";

export default function Tickets() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"create" | "history">("create");
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState("");
  const [reportedUser, setReportedUser] = useState("");
  const [selectedMember, setSelectedMember] = useState<DiscordMember | null>(null);
  const [banReason, setBanReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat view
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Members
  const [members, setMembers] = useState<DiscordMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberList, setShowMemberList] = useState(false);
  const memberListRef = useRef<HTMLDivElement>(null);

  // Close member dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (memberListRef.current && !memberListRef.current.contains(e.target as Node)) {
        setShowMemberList(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Ticket list
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "tickets"),
      where("discordId", "==", user.id),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Ticket[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Ticket, "id">),
        }));
        setTickets(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading tickets:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  // Replies for active ticket
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

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Reply[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Reply, "id">),
        }));
        setReplies(list);
        setRepliesLoading(false);
      },
      (error) => {
        console.error("Error loading replies:", error);
        setRepliesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeTicket?.id]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies, activeTicket]);

  // Members
  useEffect(() => {
    if (category !== "report") return;
    setMembersLoading(true);
    fetch(`${API_URL}/discord/members`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch members");
        return res.json();
      })
      .then((data) => setMembers(data.members || []))
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, [category]);

  const resetForm = () => {
    setCategory(null);
    setSubject("");
    setMessage("");
    setImageFile(null);
    setImagePreview(null);
    setDonationAmount("");
    setReportedUser("");
    setSelectedMember(null);
    setBanReason("");
    setMemberSearch("");
    setShowMemberList(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Please select an image file.");
    if (file.size > 5 * 1024 * 1024) return alert("Image must be under 5 MB.");
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const selectMember = (m: DiscordMember) => {
    setSelectedMember(m);
    setReportedUser(`${m.nickname || m.globalName} (@${m.username}) | ${m.id}`);
    setMemberSearch("");
    setShowMemberList(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !category || !subject.trim() || !message.trim()) return;
    if (category === "report" && !reportedUser) {
      alert("Please select a player to report.");
      return;
    }

    setSubmitting(true);
    setSuccessMsg(null);

    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const imageRef = ref(storage, `tickets/${user.id}/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      const docRef = await addDoc(collection(db, "tickets"), {
        category,
        subject: subject.trim(),
        message: message.trim(),
        imageUrl: imageUrl || null,
        status: "open",
        createdAt: serverTimestamp(),
        username: user.username,
        discordId: String(user.id),
        ...(category === "donation" && { donationAmount: donationAmount || null }),
        ...(category === "report" && { reportedUser: reportedUser || null }),
        ...(category === "ban_appeal" && { banReason: banReason || null }),
      });

      setSuccessMsg(`Ticket created successfully! (ID: ${docRef.id.slice(0, 8)})`);
      resetForm();
      setTab("history");
    } catch (err) {
      console.error(err);
      alert("Failed to create ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeTicket || !replyText.trim()) return;
    if (activeTicket.status === "closed") return;

    setSendingReply(true);
    try {
      await addDoc(collection(db, "tickets", activeTicket.id, "replies"), {
        message: replyText.trim(),
        authorId: String(user.id),
        authorName: user.username,
        authorRole: "user",
        createdAt: serverTimestamp(),
      });
      setReplyText("");
    } catch (err) {
      console.error(err);
      alert("Failed to send message.");
    } finally {
      setSendingReply(false);
    }
  };

  const filteredMembers = members
    .filter((m) => {
      const q = memberSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        m.username.toLowerCase().includes(q) ||
        (m.globalName || "").toLowerCase().includes(q) ||
        (m.nickname || "").toLowerCase().includes(q)
      );
    })
    .slice(0, 50);

  if (!user) {
    return (
      <div className="container-nrp py-16">
        <div className="card p-8 text-center">
          <p className="text-zinc-400">Please log in with Discord to manage tickets.</p>
        </div>
      </div>
    );
  }

  // ── CHAT VIEW ──
  if (activeTicket) {
    const cat = CATEGORIES.find((c) => c.id === activeTicket.category);

    return (
      <div className="container-nrp py-8 max-w-3xl">
        {/* Chat header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => setActiveTicket(null)}
              className="mb-3 text-sm text-zinc-500 hover:text-zinc-300 transition"
            >
              ← Back to history
            </button>
            <h1 className="text-xl font-bold text-white">{activeTicket.subject}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-zinc-600">
                #{activeTicket.id.slice(0, 8)}
              </span>
              <span className={`badge ${STATUS_STYLES[activeTicket.status] || STATUS_STYLES.open}`}>
                {activeTicket.status?.replace("_", " ")}
              </span>
              {cat && (
                <span className={`badge border ${cat.badge}`}>
                  {cat.icon} {cat.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="card flex flex-col" style={{ minHeight: "420px", maxHeight: "60vh" }}>
          <div className="flex-1 overflow-y-auto space-y-4 p-5">
            {/* Original ticket message */}
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-3 text-sm text-white">
                <p className="whitespace-pre-wrap">{activeTicket.message}</p>
                {activeTicket.imageUrl && (
                  <img
                    src={activeTicket.imageUrl}
                    alt=""
                    className="mt-2 max-h-40 rounded-lg"
                  />
                )}
                <p className="mt-1.5 text-right text-[10px] text-indigo-200">
                  {activeTicket.createdAt?.toDate
                    ? activeTicket.createdAt.toDate().toLocaleString()
                    : ""}
                </p>
              </div>
            </div>

            {/* Extra fields */}
            {(activeTicket.donationAmount ||
              activeTicket.reportedUser ||
              activeTicket.banReason) && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-400">
                {activeTicket.donationAmount && (
                  <p>Amount: <span className="text-zinc-200">{activeTicket.donationAmount}</span></p>
                )}
                {activeTicket.reportedUser && (
                  <p>Reported: <span className="text-zinc-200">{activeTicket.reportedUser}</span></p>
                )}
                {activeTicket.banReason && (
                  <p>Ban reason: <span className="text-zinc-200">{activeTicket.banReason}</span></p>
                )}
              </div>
            )}

            {repliesLoading && (
              <p className="text-center text-sm text-zinc-600">Loading conversation...</p>
            )}

            {replies.map((r) => {
              const isMe = r.authorRole === "user";
              return (
                <div key={r.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      isMe
                        ? "rounded-br-md bg-indigo-600 text-white"
                        : "rounded-bl-md bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {!isMe && (
                      <p className="mb-1 text-xs font-medium text-indigo-300">
                        {r.authorName} · Staff
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{r.message}</p>
                    {r.imageUrl && (
                      <img src={r.imageUrl} alt="" className="mt-2 max-h-40 rounded-lg" />
                    )}
                    <p
                      className={`mt-1.5 text-[10px] ${
                        isMe ? "text-right text-indigo-200" : "text-zinc-500"
                      }`}
                    >
                      {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : ""}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Reply input */}
          {activeTicket.status !== "closed" ? (
            <form
              onSubmit={sendReply}
              className="flex gap-2 border-t border-zinc-800 p-4"
            >
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your message..."
                className="input flex-1"
                disabled={sendingReply}
              />
              <button
                type="submit"
                disabled={sendingReply || !replyText.trim()}
                className="btn-primary px-5"
              >
                Send
              </button>
            </form>
          ) : (
            <div className="border-t border-zinc-800 px-4 py-3 text-center text-sm text-zinc-500">
              This ticket is closed. You can no longer reply.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── MAIN VIEW ──
  return (
    <div className="container-nrp py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white">Support Tickets</h1>
        <p className="mt-2 text-zinc-400">
          Logged in as <span className="font-medium text-zinc-200">{user.username}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 border-b border-zinc-800">
        <button
          onClick={() => setTab("create")}
          className={`relative px-5 py-3 text-sm font-medium transition ${
            tab === "create" ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Create Ticket
          {tab === "create" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-500" />
          )}
        </button>
        <button
          onClick={() => setTab("history")}
          className={`relative px-5 py-3 text-sm font-medium transition ${
            tab === "history" ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Ticket History
          <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
            {tickets.length}
          </span>
          {tab === "history" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-500" />
          )}
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <span>✓</span> {successMsg}
        </div>
      )}

      {/* CREATE */}
      {tab === "create" && (
        <div className="max-w-xl">
          {!category ? (
            <div>
              <h2 className="mb-5 text-lg font-semibold text-zinc-200">Select a category</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`group rounded-2xl border p-5 text-left transition-all duration-200 ${cat.color}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <div className="font-semibold text-white">{cat.label}</div>
                        <div className="mt-1 text-sm opacity-70 leading-snug">{cat.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card space-y-5 p-6">
              <div className="flex items-center justify-between">
                <span className={`badge border ${CATEGORIES.find((c) => c.id === category)?.badge}`}>
                  {CATEGORIES.find((c) => c.id === category)?.icon}{" "}
                  {CATEGORIES.find((c) => c.id === category)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => setCategory(null)}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition"
                >
                  ← Change
                </button>
              </div>

              {category === "report" && (
                <div ref={memberListRef}>
                  <label className="label">
                    Reported player <span className="text-red-400">*</span>
                  </label>
                  {membersLoading ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-zinc-500">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-400" />
                      Loading members...
                    </div>
                  ) : selectedMember ? (
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5">
                      {selectedMember.avatar ? (
                        <img src={selectedMember.avatar} alt="" className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium">
                          {(selectedMember.nickname || selectedMember.globalName)?.[0]}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">
                          {selectedMember.nickname || selectedMember.globalName}
                        </div>
                        <div className="truncate text-xs text-zinc-500">
                          @{selectedMember.username}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMember(null);
                          setReportedUser("");
                        }}
                        className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => {
                          setMemberSearch(e.target.value);
                          setShowMemberList(true);
                        }}
                        onFocus={() => setShowMemberList(true)}
                        placeholder="Search player by name..."
                        className="input"
                        autoComplete="off"
                      />
                      {showMemberList && (
                        <div className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50">
                          {filteredMembers.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-zinc-500">
                              No members found
                            </div>
                          ) : (
                            filteredMembers.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => selectMember(m)}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-800"
                              >
                                {m.avatar ? (
                                  <img src={m.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full" />
                                ) : (
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium">
                                    {(m.nickname || m.globalName)?.[0]}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-zinc-100">
                                    {m.nickname || m.globalName}
                                  </div>
                                  <div className="truncate text-xs text-zinc-500">
                                    @{m.username}
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {category === "ban_appeal" && (
                <div>
                  <label className="label">Ban reason (if known)</label>
                  <input
                    type="text"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="What were you banned for?"
                    className="input"
                  />
                </div>
              )}

              <div>
                <label className="label">
                  Subject <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Short summary of your issue"
                  maxLength={100}
                  className="input"
                />
              </div>

              <div>
                <label className="label">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  rows={5}
                  className="input resize-none"
                />
              </div>

              {/* Image */}
              <div>
                <label className="label">Attach a picture (optional)</label>
                {!imagePreview ? (
                  <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 px-6 py-8 transition hover:border-indigo-500/50 hover:bg-zinc-900">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-medium text-zinc-300 group-hover:text-white">
                        Click to upload
                      </span>
                      <p className="mt-0.5 text-xs text-zinc-500">PNG, JPG up to 5 MB</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-36 w-auto rounded-xl border border-zinc-700 object-cover shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-300 shadow-md transition hover:border-red-500 hover:bg-red-500 hover:text-white"
                    >
                      ✕
                    </button>
                    <p className="mt-2 max-w-[200px] truncate text-xs text-zinc-500">
                      {imageFile?.name}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 border-t border-zinc-800 pt-5">
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* HISTORY */}
      {tab === "history" && (
        <div className="space-y-3">
          {loading ? (
            <div className="card p-10 text-center text-zinc-500">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="card border-dashed p-12 text-center">
              <p className="text-zinc-500">No tickets yet.</p>
              <button onClick={() => setTab("create")} className="btn-primary mt-4">
                Create your first ticket
              </button>
            </div>
          ) : (
            tickets.map((ticket) => {
              const cat = CATEGORIES.find((c) => c.id === ticket.category);
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
                        <span className={`badge ${STATUS_STYLES[ticket.status] || STATUS_STYLES.open}`}>
                          {ticket.status?.replace("_", " ") || "open"}
                        </span>
                        {cat && (
                          <span className={`badge border ${cat.badge}`}>
                            {cat.icon} {cat.label}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-white">{ticket.subject}</h3>
                    </div>
                    <time className="text-xs text-zinc-600">
                      {ticket.createdAt?.toDate
                        ? ticket.createdAt.toDate().toLocaleString()
                        : "Just now"}
                    </time>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                    {ticket.message}
                  </p>
                  <p className="mt-3 text-xs text-indigo-400">Open conversation →</p>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}