import { useState, useRef, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { db } from "../lib/firebase";
import { api } from "../api";

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Gem,
  ImagePlus,
  LockKeyhole,
  MessageSquare,
  Search,
  Send,
  ShieldAlert,
  Ticket as TicketIcon,
  Wrench,
  X,
} from "lucide-react";

type TicketCategory =
  | "donation"
  | "report"
  | "ban_appeal"
  | "support";

type TicketStatus =
  | "open"
  | "in_progress"
  | "closed";

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

const API_URL = "http://localhost:4000";

const CATEGORIES = [
  {
    id: "donation" as TicketCategory,
    label: "Donation",
    description:
      "Questions about donations, rewards or packages.",
    icon: Gem,
    color:
      "border-emerald-500/20 bg-emerald-500/[0.04] hover:border-emerald-500/40 hover:bg-emerald-500/[0.08]",
    iconStyle:
      "bg-emerald-500/10 text-emerald-400",
    badge:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },

  {
    id: "report" as TicketCategory,
    label: "Player Report",
    description:
      "Report a player or a rule violation.",
    icon: ShieldAlert,
    color:
      "border-red-500/20 bg-red-500/[0.04] hover:border-red-500/40 hover:bg-red-500/[0.08]",
    iconStyle:
      "bg-red-500/10 text-red-400",
    badge:
      "border-red-500/20 bg-red-500/10 text-red-300",
  },

  {
    id: "ban_appeal" as TicketCategory,
    label: "Ban Appeal",
    description:
      "Request a review of your ban or punishment.",
    icon: Ban,
    color:
      "border-amber-500/20 bg-amber-500/[0.04] hover:border-amber-500/40 hover:bg-amber-500/[0.08]",
    iconStyle:
      "bg-amber-500/10 text-amber-400",
    badge:
      "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },

  {
    id: "support" as TicketCategory,
    label: "General Support",
    description:
      "General help, bugs or other issues.",
    icon: Wrench,
    color:
      "border-indigo-500/20 bg-indigo-500/[0.04] hover:border-indigo-500/40 hover:bg-indigo-500/[0.08]",
    iconStyle:
      "bg-indigo-500/10 text-indigo-400",
    badge:
      "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
  },
];

const STATUS_STYLES: Record<TicketStatus, string> = {
  open:
    "border-blue-500/20 bg-blue-500/10 text-blue-300",

  in_progress:
    "border-amber-500/20 bg-amber-500/10 text-amber-300",

  closed:
    "border-zinc-500/20 bg-zinc-500/10 text-zinc-400",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
};

function formatDate(value: any) {
  if (!value?.toDate) return "Just now";

  return value.toDate().toLocaleString();
}

export default function Tickets() {
  const { user } = useAuth();

  const [tab, setTab] =
    useState<"create" | "history">("create");

  const [category, setCategory] =
    useState<TicketCategory | null>(null);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState<string | null>(null);

  const [uploadingImage, setUploadingImage] =
    useState(false);

  const [donationAmount, setDonationAmount] =
    useState("");

  const [reportedUser, setReportedUser] =
    useState("");

  const [selectedMember, setSelectedMember] =
    useState<DiscordMember | null>(null);

  const [banReason, setBanReason] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [successMsg, setSuccessMsg] =
    useState<string | null>(null);

  const [tickets, setTickets] =
    useState<Ticket[]>([]);

  const [loading, setLoading] =
    useState(true);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [activeTicket, setActiveTicket] =
    useState<Ticket | null>(null);

  const [replies, setReplies] =
    useState<Reply[]>([]);

  const [repliesLoading, setRepliesLoading] =
    useState(false);

  const [replyText, setReplyText] =
    useState("");

  const [sendingReply, setSendingReply] =
    useState(false);

  const chatEndRef =
    useRef<HTMLDivElement>(null);

  const [members, setMembers] =
    useState<DiscordMember[]>([]);

  const [membersLoading, setMembersLoading] =
    useState(false);

  const [memberSearch, setMemberSearch] =
    useState("");

  const [showMemberList, setShowMemberList] =
    useState(false);

  const memberListRef =
    useRef<HTMLDivElement>(null);

  /* -----------------------------
     Close player dropdown
  ----------------------------- */

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        memberListRef.current &&
        !memberListRef.current.contains(
          e.target as Node
        )
      ) {
        setShowMemberList(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handler
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handler
      );
  }, []);

  /* -----------------------------
     Load user tickets
  ----------------------------- */

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "tickets"),
      where(
        "discordId",
        "==",
        String(user.id)
      ),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Ticket[] =
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Ticket, "id">),
          }));

        setTickets(list);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Error loading tickets:",
          error
        );

        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.id]);

  /* -----------------------------
     Load replies
  ----------------------------- */

  useEffect(() => {
    if (!activeTicket) {
      setReplies([]);
      return;
    }

    setRepliesLoading(true);

    const q = query(
      collection(
        db,
        "tickets",
        activeTicket.id,
        "replies"
      ),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Reply[] =
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Reply, "id">),
          }));

        setReplies(list);
        setRepliesLoading(false);
      },
      (error) => {
        console.error(error);
        setRepliesLoading(false);
      }
    );

    return unsubscribe;
  }, [activeTicket?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [replies, activeTicket]);

  /* -----------------------------
     Load Discord members
  ----------------------------- */

  useEffect(() => {
    if (category !== "report") return;

    setMembersLoading(true);

    fetch(`${API_URL}/discord/members`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok)
          throw new Error(
            "Failed to fetch members"
          );

        return res.json();
      })
      .then((data) => {
        setMembers(data.members || []);
      })
      .catch(() => {
        setMembers([]);
      })
      .finally(() => {
        setMembersLoading(false);
      });
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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB.");
      return;
    }

    setImageFile(file);

    const reader = new FileReader();

    reader.onload = () => {
      setImagePreview(
        reader.result as string
      );
    };

    reader.readAsDataURL(file);
  };

  const selectMember = (
    member: DiscordMember
  ) => {
    setSelectedMember(member);

    setReportedUser(
      `${member.nickname || member.globalName} (@${member.username}) | ${member.id}`
    );

    setMemberSearch("");
    setShowMemberList(false);
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !user ||
      !category ||
      !subject.trim() ||
      !message.trim()
    ) {
      return;
    }

    if (
      category === "report" &&
      !reportedUser
    ) {
      alert("Please select a player to report.");
      return;
    }

    setSubmitting(true);
    setSuccessMsg(null);

    try {
      let imageUrl:
        | string
        | undefined;

      if (imageFile) {
        setUploadingImage(true);

        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadRes = await api.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        imageUrl = uploadRes.data?.url;
        setUploadingImage(false);
      }

      const docRef = await addDoc(
        collection(db, "tickets"),
        {
          category,
          subject: subject.trim(),
          message: message.trim(),
          imageUrl: imageUrl || null,
          status: "open",
          createdAt: serverTimestamp(),
          username: user.username,
          discordId: String(user.id),

          ...(category === "donation" && {
            donationAmount:
              donationAmount || null,
          }),

          ...(category === "report" && {
            reportedUser:
              reportedUser || null,
          }),

          ...(category === "ban_appeal" && {
            banReason:
              banReason || null,
          }),
        }
      );

      setSuccessMsg(
        `Ticket created successfully — #${docRef.id.slice(
          0,
          8
        )}`
      );

      resetForm();
      setTab("history");
    } catch (error) {
      console.error(error);
      alert("Failed to create ticket.");
    } finally {
      setUploadingImage(false);
      setSubmitting(false);
    }
  };

  const sendReply = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !user ||
      !activeTicket ||
      !replyText.trim()
    ) {
      return;
    }

    if (
      activeTicket.status === "closed"
    ) {
      return;
    }

    setSendingReply(true);

    try {
      await addDoc(
        collection(
          db,
          "tickets",
          activeTicket.id,
          "replies"
        ),
        {
          message: replyText.trim(),
          authorId: String(user.id),
          authorName: user.username,
          authorRole: "user",
          createdAt: serverTimestamp(),
        }
      );

      setReplyText("");
    } catch (error) {
      console.error(error);
      alert("Failed to send message.");
    } finally {
      setSendingReply(false);
    }
  };

  const filteredMembers = members
    .filter((member) => {
      const q =
        memberSearch
          .toLowerCase()
          .trim();

      if (!q) return true;

      return (
        member.username
          .toLowerCase()
          .includes(q) ||
        (member.globalName || "")
          .toLowerCase()
          .includes(q) ||
        (member.nickname || "")
          .toLowerCase()
          .includes(q)
      );
    })
    .slice(0, 50);

  const activeCategory = category
    ? CATEGORIES.find(
        (item) => item.id === category
      )
    : null;

  if (!user) {
    return (
      <div className="container-nrp py-16">
        <div className="card mx-auto max-w-lg p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
            <LockKeyhole className="h-6 w-6" />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-white">
            Sign in required
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Sign in with Discord to create and manage
            your support tickets.
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     CHAT VIEW
  ========================================================= */

  if (activeTicket) {
    const cat = CATEGORIES.find(
      (item) =>
        item.id === activeTicket.category
    );

    const Icon = cat?.icon || CircleHelp;

    return (
      <div className="container-nrp page max-w-6xl">
        <button
          onClick={() =>
            setActiveTicket(null)
          }
          className="mb-6 flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my tickets
        </button>

        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-zinc-600">
                  #{activeTicket.id.slice(0, 8)}
                </span>

                <span
                  className={`badge ${
                    STATUS_STYLES[
                      activeTicket.status
                    ]
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {
                    STATUS_LABELS[
                      activeTicket.status
                    ]
                  }
                </span>

                {cat && (
                  <span
                    className={`badge ${cat.badge}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat.label}
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
                {activeTicket.subject}
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Support conversation
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          {/* CHAT */}
          <div className="card overflow-hidden">
            <div
              className="chat-scroll flex flex-col overflow-y-auto p-5 sm:p-6"
              style={{
                minHeight: "480px",
                maxHeight: "65vh",
              }}
            >
              <div className="mb-6 flex items-center justify-center">
                <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-[11px] text-zinc-500">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Ticket opened on{" "}
                  {formatDate(
                    activeTicket.createdAt
                  )}
                </div>
              </div>

              {/* ORIGINAL MESSAGE */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-3 text-sm text-white shadow-lg shadow-indigo-900/10">
                  <div className="mb-2 flex items-center justify-between gap-6">
                    <span className="text-xs font-semibold text-indigo-100">
                      {activeTicket.username}
                    </span>

                    <span className="text-[10px] text-indigo-200">
                      {formatDate(
                        activeTicket.createdAt
                      )}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap leading-6">
                    {activeTicket.message}
                  </p>

                  {activeTicket.imageUrl && (
                    <img
                      src={activeTicket.imageUrl}
                      alt="Ticket attachment"
                      className="mt-3 max-h-72 rounded-xl border border-white/10 object-contain"
                    />
                  )}
                </div>
              </div>

              {/* EXTRA INFO */}
              {(activeTicket.donationAmount ||
                activeTicket.reportedUser ||
                activeTicket.banReason) && (
                <div className="my-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    Ticket information
                  </p>

                  <div className="space-y-2 text-sm">
                    {activeTicket.donationAmount && (
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-500">
                          Donation amount
                        </span>

                        <span className="text-zinc-200">
                          {
                            activeTicket.donationAmount
                          }
                        </span>
                      </div>
                    )}

                    {activeTicket.reportedUser && (
                      <div>
                        <span className="text-zinc-500">
                          Reported player
                        </span>

                        <p className="mt-1 break-all text-zinc-200">
                          {
                            activeTicket.reportedUser
                          }
                        </p>
                      </div>
                    )}

                    {activeTicket.banReason && (
                      <div>
                        <span className="text-zinc-500">
                          Ban reason
                        </span>

                        <p className="mt-1 text-zinc-200">
                          {
                            activeTicket.banReason
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {repliesLoading && (
                <div className="my-6 flex justify-center">
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-400" />
                    Loading conversation...
                  </div>
                </div>
              )}

              {/* REPLIES */}
              <div className="mt-5 space-y-4">
                {replies.map((reply) => {
                  const isMe =
                    reply.authorRole ===
                    "user";

                  return (
                    <div
                      key={reply.id}
                      className={`flex ${
                        isMe
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                          isMe
                            ? "rounded-br-md bg-indigo-600 text-white"
                            : "rounded-bl-md border border-zinc-800 bg-zinc-900 text-zinc-100"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-6">
                          <span
                            className={`text-xs font-semibold ${
                              isMe
                                ? "text-indigo-100"
                                : "text-indigo-300"
                            }`}
                          >
                            {reply.authorName}
                            {!isMe &&
                              " · Staff"}
                          </span>

                          <span
                            className={`text-[10px] ${
                              isMe
                                ? "text-indigo-200"
                                : "text-zinc-600"
                            }`}
                          >
                            {formatDate(
                              reply.createdAt
                            )}
                          </span>
                        </div>

                        <p className="whitespace-pre-wrap leading-6">
                          {reply.message}
                        </p>

                        {reply.imageUrl && (
                          <img
                            src={reply.imageUrl}
                            alt="Attachment"
                            className="mt-3 max-h-72 rounded-xl"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div ref={chatEndRef} />
            </div>

            {/* REPLY */}
            {activeTicket.status !==
            "closed" ? (
              <form
                onSubmit={sendReply}
                className="border-t border-zinc-800 bg-zinc-950/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <input
                    value={replyText}
                    onChange={(e) =>
                      setReplyText(
                        e.target.value
                      )
                    }
                    placeholder="Write a message..."
                    className="input"
                    disabled={sendingReply}
                  />

                  <button
                    type="submit"
                    disabled={
                      sendingReply ||
                      !replyText.trim()
                    }
                    className="btn-primary shrink-0 px-4"
                  >
                    <Send className="h-4 w-4" />

                    <span className="hidden sm:inline">
                      Send
                    </span>
                  </button>
                </div>

                <p className="mt-2 px-1 text-[11px] text-zinc-600">
                  Please keep the conversation respectful and
                  provide any useful information to our staff.
                </p>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2 border-t border-zinc-800 px-4 py-4 text-sm text-zinc-500">
                <LockKeyhole className="h-4 w-4" />
                This ticket is closed.
              </div>
            )}
          </div>

          {/* INFO SIDEBAR */}
          <aside className="space-y-4">
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Ticket details
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs text-zinc-600">
                    Ticket ID
                  </p>

                  <p className="mt-1 font-mono text-sm text-zinc-300">
                    #{activeTicket.id.slice(0, 8)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-600">
                    Category
                  </p>

                  <div className="mt-2">
                    {cat && (
                      <span
                        className={`badge ${cat.badge}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {cat.label}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-zinc-600">
                    Status
                  </p>

                  <div className="mt-2">
                    <span
                      className={`badge ${
                        STATUS_STYLES[
                          activeTicket.status
                        ]
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {
                        STATUS_LABELS[
                          activeTicket.status
                        ]
                      }
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-zinc-600">
                    Created
                  </p>

                  <p className="mt-1 text-sm text-zinc-300">
                    {formatDate(
                      activeTicket.createdAt
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.04] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <CircleHelp className="h-4 w-4" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-white">
                Need more help?
              </h3>

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Keep your ticket conversation in one place so our
                staff can help you faster.
              </p>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN VIEW
  ========================================================= */

  return (
    <div className="container-nrp page">
      {/* HEADER */}
      <div className="mb-8">
        <div className="eyebrow">
          <TicketIcon className="h-3.5 w-3.5" />
          Support Center
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How can we help?
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Create a support request or check the status of your
              existing tickets.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-bold text-indigo-400">
              {user.username
                ?.charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                Signed in as
              </p>

              <p className="text-xs font-medium text-zinc-300">
                {user.username}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="mb-8 flex border-b border-zinc-800">
        <button
          onClick={() => {
            setTab("create");
            setSuccessMsg(null);
          }}
          className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition ${
            tab === "create"
              ? "text-white"
              : "text-zinc-600 hover:text-zinc-300"
          }`}
        >
          <TicketIcon className="h-4 w-4" />
          New Ticket

          {tab === "create" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-500" />
          )}
        </button>

        <button
          onClick={() => {
            setTab("history");
            setSuccessMsg(null);
          }}
          className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition ${
            tab === "history"
              ? "text-white"
              : "text-zinc-600 hover:text-zinc-300"
          }`}
        >
          <MessageSquare className="h-4 w-4" />

          My Tickets

          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
            {tickets.length}
          </span>

          {tab === "history" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-500" />
          )}
        </button>
      </div>

      {/* SUCCESS */}
      {successMsg && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>

          <div>
            <p className="text-sm font-semibold text-emerald-300">
              Ticket created
            </p>

            <p className="mt-0.5 text-xs text-emerald-400/70">
              {successMsg}
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          CREATE
      ===================================================== */}

      {tab === "create" && (
        <>
          {!category ? (
            <div>
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-white">
                  What do you need help with?
                </h2>

                <p className="mt-1 text-sm text-zinc-600">
                  Select the category that best matches your request.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {CATEGORIES.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setCategory(item.id)
                      }
                      className={`group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-200 ${item.color}`}
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.iconStyle}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <ChevronRight className="h-4 w-4 text-zinc-700 transition group-hover:translate-x-1 group-hover:text-zinc-400" />
                      </div>

                      <h3 className="mt-5 font-semibold text-white">
                        {item.label}
                      </h3>

                      <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                        {item.description}
                      </p>

                      <p className="mt-5 text-xs font-semibold text-zinc-600 transition group-hover:text-zinc-400">
                        Continue →
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              {/* FORM */}
              <form
                onSubmit={handleSubmit}
                className="card overflow-hidden"
              >
                <div className="border-b border-zinc-800 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {activeCategory && (
                        <>
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${activeCategory.iconStyle}`}
                          >
                            <activeCategory.icon className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-white">
                              {activeCategory.label}
                            </p>

                            <p className="text-xs text-zinc-600">
                              Create a new request
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setCategory(null)
                      }
                      className="btn-ghost px-3 py-2 text-xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Change
                    </button>
                  </div>
                </div>

                <div className="space-y-6 p-6">
                  {/* REPORT PLAYER */}
                  {category === "report" && (
                    <div
                      ref={memberListRef}
                    >
                      <label className="label">
                        Reported player{" "}
                        <span className="text-red-400">
                          *
                        </span>
                      </label>

                      {membersLoading ? (
                        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-600">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-400" />
                          Loading players...
                        </div>
                      ) : selectedMember ? (
                        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                          {selectedMember.avatar ? (
                            <img
                              src={
                                selectedMember.avatar
                              }
                              alt=""
                              className="h-9 w-9 rounded-full"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-400">
                              {(
                                selectedMember.nickname ||
                                selectedMember.globalName ||
                                selectedMember.username
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {selectedMember.nickname ||
                                selectedMember.globalName}
                            </p>

                            <p className="truncate text-xs text-zinc-600">
                              @{selectedMember.username}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMember(
                                null
                              );
                              setReportedUser(
                                ""
                              );
                            }}
                            className="btn-ghost px-2 py-1 text-xs"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

                            <input
                              value={
                                memberSearch
                              }
                              onChange={(e) => {
                                setMemberSearch(
                                  e.target.value
                                );
                                setShowMemberList(
                                  true
                                );
                              }}
                              onFocus={() =>
                                setShowMemberList(
                                  true
                                )
                              }
                              placeholder="Search player by name..."
                              className="input pl-10"
                              autoComplete="off"
                            />
                          </div>

                          {showMemberList && (
                            <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl shadow-black/60">
                              {filteredMembers.length ===
                              0 ? (
                                <div className="px-4 py-8 text-center text-sm text-zinc-600">
                                  No players found
                                </div>
                              ) : (
                                filteredMembers.map(
                                  (member) => (
                                    <button
                                      key={
                                        member.id
                                      }
                                      type="button"
                                      onClick={() =>
                                        selectMember(
                                          member
                                        )
                                      }
                                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
                                    >
                                      {member.avatar ? (
                                        <img
                                          src={
                                            member.avatar
                                          }
                                          alt=""
                                          className="h-8 w-8 rounded-full"
                                        />
                                      ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-400">
                                          {(
                                            member.nickname ||
                                            member.globalName ||
                                            member.username
                                          )
                                            .charAt(
                                              0
                                            )
                                            .toUpperCase()}
                                        </div>
                                      )}

                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-zinc-200">
                                          {member.nickname ||
                                            member.globalName}
                                        </p>

                                        <p className="truncate text-xs text-zinc-600">
                                          @
                                          {
                                            member.username
                                          }
                                        </p>
                                      </div>
                                    </button>
                                  )
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BAN REASON */}
                  {category ===
                    "ban_appeal" && (
                    <div>
                      <label className="label">
                        Ban reason
                        <span className="ml-1 text-zinc-600">
                          (if known)
                        </span>
                      </label>

                      <input
                        type="text"
                        value={banReason}
                        onChange={(e) =>
                          setBanReason(
                            e.target.value
                          )
                        }
                        placeholder="What were you banned for?"
                        className="input"
                      />
                    </div>
                  )}

                 

                  {/* SUBJECT */}
                  <div>
                    <label className="label">
                      Subject{" "}
                      <span className="text-red-400">
                        *
                      </span>
                    </label>

                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) =>
                        setSubject(
                          e.target.value
                        )
                      }
                      placeholder="Briefly describe your issue"
                      maxLength={100}
                      className="input"
                    />

                    <p className="mt-2 text-right text-[11px] text-zinc-700">
                      {subject.length}/100
                    </p>
                  </div>

                  {/* MESSAGE */}
                  <div>
                    <label className="label">
                      Message{" "}
                      <span className="text-red-400">
                        *
                      </span>
                    </label>

                    <textarea
                      required
                      value={message}
                      onChange={(e) =>
                        setMessage(
                          e.target.value
                        )
                      }
                      placeholder="Explain your situation and provide any useful details..."
                      rows={7}
                      className="input resize-none"
                    />
                  </div>

                  {/* IMAGE */}
                  <div>
                    <label className="label">
                      Evidence or attachment
                      <span className="ml-1 text-zinc-600">
                        (optional)
                      </span>
                    </label>

                    {!imagePreview ? (
                      <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-9 transition hover:border-indigo-500/40 hover:bg-indigo-500/[0.03]">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/70 text-zinc-500 transition group-hover:bg-indigo-500/10 group-hover:text-indigo-400">
                          <ImagePlus className="h-5 w-5" />
                        </div>

                        <p className="mt-4 text-sm font-medium text-zinc-300">
                          Upload an image
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          PNG, JPG or WEBP · Max 5 MB
                        </p>

                        <input
                          ref={
                            fileInputRef
                          }
                          type="file"
                          accept="image/*"
                          onChange={
                            handleImageChange
                          }
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-72 w-full rounded-xl object-contain"
                        />

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="min-w-0 truncate text-xs text-zinc-500">
                            {imageFile?.name}
                          </p>

                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(
                                null
                              );
                              setImagePreview(
                                null
                              );

                              if (
                                fileInputRef.current
                              ) {
                                fileInputRef.current.value =
                                  "";
                              }
                            }}
                            className="btn-danger shrink-0 px-3 py-2 text-xs"
                          >
                            <X className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* FORM FOOTER */}
                <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 bg-zinc-950/30 p-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting || uploadingImage}
                    className="btn-primary"
                  >
                    {submitting || uploadingImage ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {uploadingImage ? "Uploading image..." : "Creating ticket..."}
                      </>
                    ) : (
                      <>
                        Create Ticket
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* SIDE INFO */}
              <aside className="space-y-4">
                <div className="card p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    Before submitting
                  </p>

                  <div className="mt-5 space-y-4">
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-zinc-300">
                          Be specific
                        </p>

                        <p className="mt-1 text-xs leading-5 text-zinc-600">
                          Give staff enough information to understand
                          your situation.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                        <ImagePlus className="h-3.5 w-3.5" />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-zinc-300">
                          Add evidence
                        </p>

                        <p className="mt-1 text-xs leading-5 text-zinc-600">
                          Screenshots can help staff process reports
                          faster.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-zinc-300">
                          One issue per ticket
                        </p>

                        <p className="mt-1 text-xs leading-5 text-zinc-600">
                          This keeps support organized and easier to
                          resolve.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.035] p-5">
                  <p className="text-xs font-semibold text-indigo-300">
                    Support response
                  </p>

                  <p className="mt-2 text-xs leading-5 text-zinc-600">
                    Once submitted, you can follow the conversation
                    from your ticket history.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </>
      )}

      {/* =====================================================
          HISTORY
      ===================================================== */}

      {tab === "history" && (
        <div>
          <div className="mb-5 flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-white">
              My tickets
            </h2>

            <p className="text-sm text-zinc-600">
              View and continue your support conversations.
            </p>
          </div>

          {loading ? (
            <div className="card flex min-h-48 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-400" />
                Loading your tickets...
              </div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="card flex min-h-72 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                <TicketIcon className="h-6 w-6" />
              </div>

              <h3 className="mt-5 font-semibold text-white">
                No tickets yet
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-600">
                You haven't created a support ticket yet. If you need
                help, we're ready.
              </p>

              <button
                onClick={() =>
                  setTab("create")
                }
                className="btn-primary mt-6"
              >
                Create a ticket
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const cat =
                  CATEGORIES.find(
                    (item) =>
                      item.id ===
                      ticket.category
                  );

                const Icon =
                  cat?.icon || CircleHelp;

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() =>
                      setActiveTicket(ticket)
                    }
                    className="card-hover group w-full p-5 text-left"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] text-zinc-700">
                            #{ticket.id.slice(0, 8)}
                          </span>

                          <span
                            className={`badge ${
                              STATUS_STYLES[
                                ticket.status
                              ]
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />

                            {
                              STATUS_LABELS[
                                ticket.status
                              ]
                            }
                          </span>

                          {cat && (
                            <span
                              className={`badge ${cat.badge}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {cat.label}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 truncate font-semibold text-white">
                          {ticket.subject}
                        </h3>

                        <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-zinc-500">
                          {ticket.message}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                        <time className="text-[11px] text-zinc-700">
                          {formatDate(
                            ticket.createdAt
                          )}
                        </time>

                        <span className="flex items-center gap-1 text-xs font-medium text-indigo-400 opacity-70 transition group-hover:opacity-100">
                          View ticket
                          <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}