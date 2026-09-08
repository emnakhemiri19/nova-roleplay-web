import {
  useState,
  useEffect,
  useRef,
} from "react";

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
} from "firebase/firestore";

import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Gem,
  LifeBuoy,
  Search,
  Send,
  ShieldAlert,
  Ticket,
  Wrench,
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

interface TicketType {
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

const CATEGORIES = {
  donation: {
    label: "Donation",
    icon: Gem,
    badge:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    iconStyle:
      "bg-emerald-500/10 text-emerald-400",
  },

  report: {
    label: "Player Report",
    icon: ShieldAlert,
    badge:
      "border-red-500/20 bg-red-500/10 text-red-300",
    iconStyle:
      "bg-red-500/10 text-red-400",
  },

  ban_appeal: {
    label: "Ban Appeal",
    icon: Ban,
    badge:
      "border-amber-500/20 bg-amber-500/10 text-amber-300",
    iconStyle:
      "bg-amber-500/10 text-amber-400",
  },

  support: {
    label: "General Support",
    icon: Wrench,
    badge:
      "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
    iconStyle:
      "bg-indigo-500/10 text-indigo-400",
  },
};

const STATUS_STYLES: Record<
  TicketStatus,
  string
> = {
  open:
    "border-blue-500/20 bg-blue-500/10 text-blue-300",

  in_progress:
    "border-amber-500/20 bg-amber-500/10 text-amber-300",

  closed:
    "border-zinc-500/20 bg-zinc-500/10 text-zinc-400",
};

const STATUS_LABELS: Record<
  TicketStatus,
  string
> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
};

function formatDate(value: any) {
  if (!value?.toDate) return "Just now";

  return value.toDate().toLocaleString();
}

export default function Admin() {
  const { user } = useAuth();

  const [tickets, setTickets] =
    useState<TicketType[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [filter, setFilter] =
    useState<"all" | TicketStatus>("all");

  const [search, setSearch] =
    useState("");

  const [activeTicket, setActiveTicket] =
    useState<TicketType | null>(null);

  const [replies, setReplies] =
    useState<Reply[]>([]);

  const [repliesLoading, setRepliesLoading] =
    useState(false);

  const [replyText, setReplyText] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const chatEndRef =
    useRef<HTMLDivElement>(null);

  /* -----------------------------
     Load tickets
  ----------------------------- */

  useEffect(() => {
    const q = query(
      collection(db, "tickets"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: TicketType[] =
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<
              TicketType,
              "id"
            >),
          }));

        setTickets(list);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

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
            ...(d.data() as Omit<
              Reply,
              "id"
            >),
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
     Statistics
  ----------------------------- */

  const counts = {
    all: tickets.length,

    open: tickets.filter(
      (ticket) =>
        ticket.status === "open"
    ).length,

    in_progress: tickets.filter(
      (ticket) =>
        ticket.status === "in_progress"
    ).length,

    closed: tickets.filter(
      (ticket) =>
        ticket.status === "closed"
    ).length,
  };

  /* -----------------------------
     Search + filters
  ----------------------------- */

  const filtered = tickets.filter(
    (ticket) => {
      const matchesStatus =
        filter === "all" ||
        ticket.status === filter;

      const q =
        search
          .toLowerCase()
          .trim();

      const matchesSearch =
        !q ||
        ticket.subject
          .toLowerCase()
          .includes(q) ||
        ticket.username
          .toLowerCase()
          .includes(q) ||
        ticket.id
          .toLowerCase()
          .includes(q);

      return (
        matchesStatus &&
        matchesSearch
      );
    }
  );

  /* -----------------------------
     Update status
  ----------------------------- */

  const updateStatus = async (
    status: TicketStatus
  ) => {
    if (!activeTicket) return;

    try {
      await updateDoc(
        doc(
          db,
          "tickets",
          activeTicket.id
        ),
        {
          status,
        }
      );

      setActiveTicket({
        ...activeTicket,
        status,
      });
    } catch (error) {
      console.error(error);
      alert(
        "Failed to update ticket status."
      );
    }
  };

  /* -----------------------------
     Send staff reply
  ----------------------------- */

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

    setSending(true);

    try {
      await addDoc(
        collection(
          db,
          "tickets",
          activeTicket.id,
          "replies"
        ),
        {
          message:
            replyText.trim(),
          authorId: String(user.id),
          authorName:
            user.username,
          authorRole: "staff",
          createdAt:
            serverTimestamp(),
        }
      );

      if (
        activeTicket.status ===
        "open"
      ) {
        await updateDoc(
          doc(
            db,
            "tickets",
            activeTicket.id
          ),
          {
            status: "in_progress",
          }
        );

        setActiveTicket({
          ...activeTicket,
          status: "in_progress",
        });
      }

      setReplyText("");
    } catch (error: any) {
      console.error(error);

      alert(
        `Failed to send reply:\n${
          error?.message ||
          error?.code ||
          "Unknown error"
        }`
      );
    } finally {
      setSending(false);
    }
  };

  /* =========================================================
     TICKET WORKSPACE
  ========================================================= */

  if (activeTicket) {
    const category =
      CATEGORIES[
        activeTicket.category
      ];

    const CategoryIcon =
      category?.icon || LifeBuoy;

    return (
      <div className="container-nrp page max-w-7xl">
        <button
          onClick={() =>
            setActiveTicket(null)
          }
          className="mb-6 flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to ticket queue
        </button>

        {/* HEADER */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-zinc-700">
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

                {category && (
                  <span
                    className={`badge ${category.badge}`}
                  >
                    <CategoryIcon className="h-3.5 w-3.5" />
                    {category.label}
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
                {activeTicket.subject}
              </h1>

              <p className="mt-1 text-sm text-zinc-600">
                Submitted by{" "}
                <span className="text-zinc-400">
                  {activeTicket.username}
                </span>
              </p>
            </div>

            {/* STATUS CONTROLS */}
            <div className="flex flex-wrap gap-2">
              {activeTicket.status !==
                "open" && (
                <button
                  onClick={() =>
                    updateStatus("open")
                  }
                  className="btn-secondary text-xs"
                >
                  <CircleDot className="h-3.5 w-3.5" />
                  Mark Open
                </button>
              )}

              {activeTicket.status !==
                "in_progress" && (
                <button
                  onClick={() =>
                    updateStatus(
                      "in_progress"
                    )
                  }
                  className="btn-secondary text-xs"
                >
                  <Clock3 className="h-3.5 w-3.5" />
                  In Progress
                </button>
              )}

              {activeTicket.status !==
                "closed" && (
                <button
                  onClick={() =>
                    updateStatus("closed")
                  }
                  className="btn-danger text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Close Ticket
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_290px]">
          {/* CHAT */}
          <div className="card overflow-hidden">
            <div
              className="chat-scroll overflow-y-auto p-5 sm:p-6"
              style={{
                minHeight: "500px",
                maxHeight: "68vh",
              }}
            >
              <div className="mb-6 flex justify-center">
                <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-[10px] text-zinc-600">
                  Ticket created{" "}
                  {formatDate(
                    activeTicket.createdAt
                  )}
                </span>
              </div>

              {/* ORIGINAL USER MESSAGE */}
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100">
                  <div className="mb-2 flex items-center justify-between gap-6">
                    <div>
                      <p className="text-xs font-semibold text-zinc-300">
                        {
                          activeTicket.username
                        }
                      </p>

                      <p className="text-[10px] text-zinc-600">
                        User
                      </p>
                    </div>

                    <span className="text-[10px] text-zinc-600">
                      {formatDate(
                        activeTicket.createdAt
                      )}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap leading-6">
                    {
                      activeTicket.message
                    }
                  </p>

                  {activeTicket.imageUrl && (
                    <img
                      src={
                        activeTicket.imageUrl
                      }
                      alt="Ticket attachment"
                      className="mt-3 max-h-72 rounded-xl border border-zinc-800 object-contain"
                    />
                  )}
                </div>
              </div>

              {/* METADATA */}
              {(activeTicket.donationAmount ||
                activeTicket.reportedUser ||
                activeTicket.banReason) && (
                <div className="my-5 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                    Request information
                  </p>

                  <div className="space-y-3">
                    {activeTicket.donationAmount && (
                      <div>
                        <p className="text-xs text-zinc-600">
                          Donation amount
                        </p>

                        <p className="mt-1 text-sm text-zinc-300">
                          {
                            activeTicket.donationAmount
                          }
                        </p>
                      </div>
                    )}

                    {activeTicket.reportedUser && (
                      <div>
                        <p className="text-xs text-zinc-600">
                          Reported player
                        </p>

                        <p className="mt-1 break-all text-sm text-zinc-300">
                          {
                            activeTicket.reportedUser
                          }
                        </p>
                      </div>
                    )}

                    {activeTicket.banReason && (
                      <div>
                        <p className="text-xs text-zinc-600">
                          Ban reason
                        </p>

                        <p className="mt-1 text-sm text-zinc-300">
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
                    Loading replies...
                  </div>
                </div>
              )}

              {/* REPLIES */}
              <div className="mt-5 space-y-4">
                {replies.map((reply) => {
                  const isStaff =
                    reply.authorRole ===
                    "staff";

                  return (
                    <div
                      key={reply.id}
                      className={`flex ${
                        isStaff
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                          isStaff
                            ? "rounded-br-md bg-indigo-600 text-white"
                            : "rounded-bl-md border border-zinc-800 bg-zinc-900 text-zinc-100"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-6">
                          <div>
                            <p
                              className={`text-xs font-semibold ${
                                isStaff
                                  ? "text-indigo-100"
                                  : "text-zinc-300"
                              }`}
                            >
                              {
                                reply.authorName
                              }
                            </p>

                            <p
                              className={`text-[10px] ${
                                isStaff
                                  ? "text-indigo-200/70"
                                  : "text-zinc-600"
                              }`}
                            >
                              {isStaff
                                ? "Staff"
                                : "User"}
                            </p>
                          </div>

                          <span
                            className={`text-[10px] ${
                              isStaff
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
                          {
                            reply.message
                          }
                        </p>

                        {reply.imageUrl && (
                          <img
                            src={
                              reply.imageUrl
                            }
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

            {/* STAFF REPLY */}
            {activeTicket.status !==
            "closed" ? (
              <form
                onSubmit={sendReply}
                className="border-t border-zinc-800 bg-zinc-950/40 p-4"
              >
                <div className="flex items-center gap-3">
                  <input
                    value={replyText}
                    onChange={(e) =>
                      setReplyText(
                        e.target.value
                      )
                    }
                    placeholder="Reply to this ticket..."
                    className="input"
                    disabled={sending}
                  />

                  <button
                    type="submit"
                    disabled={
                      sending ||
                      !replyText.trim()
                    }
                    className="btn-primary shrink-0"
                  >
                    <Send className="h-4 w-4" />

                    <span className="hidden sm:inline">
                      Reply
                    </span>
                  </button>
                </div>

                <p className="mt-2 px-1 text-[10px] text-zinc-700">
                  Replying as{" "}
                  <span className="text-zinc-500">
                    {user?.username}
                  </span>
                </p>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2 border-t border-zinc-800 px-4 py-4 text-sm text-zinc-600">
                <CheckCircle2 className="h-4 w-4" />
                This ticket is closed.
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-4">
            <div className="card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Ticket details
              </p>

              <div className="mt-5 space-y-5">
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
                    Customer
                  </p>

                  <p className="mt-1 text-sm font-medium text-zinc-300">
                    {
                      activeTicket.username
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-600">
                    Category
                  </p>

                  <div className="mt-2">
                    {category && (
                      <span
                        className={`badge ${category.badge}`}
                      >
                        <CategoryIcon className="h-3.5 w-3.5" />
                        {category.label}
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

            <div className="card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Quick actions
              </p>

              <div className="mt-4 space-y-2">
                {activeTicket.status !==
                  "open" && (
                  <button
                    onClick={() =>
                      updateStatus("open")
                    }
                    className="btn-secondary w-full justify-between text-xs"
                  >
                    Mark as open
                    <CircleDot className="h-3.5 w-3.5" />
                  </button>
                )}

                {activeTicket.status !==
                  "in_progress" && (
                  <button
                    onClick={() =>
                      updateStatus(
                        "in_progress"
                      )
                    }
                    className="btn-secondary w-full justify-between text-xs"
                  >
                    Start handling
                    <Clock3 className="h-3.5 w-3.5" />
                  </button>
                )}

                {activeTicket.status !==
                  "closed" && (
                  <button
                    onClick={() =>
                      updateStatus(
                        "closed"
                      )
                    }
                    className="btn-danger w-full justify-between text-xs"
                  >
                    Close ticket
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  /* =========================================================
     ADMIN DASHBOARD
  ========================================================= */

  return (
    <div className="container-nrp page">
      {/* HEADER */}
      <div className="mb-8">
        <div className="eyebrow">
          <ShieldAlert className="h-3.5 w-3.5" />
          Staff Area
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Support Dashboard
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Manage, review and respond to community support requests.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live ticket updates
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600">
              Total tickets
            </span>

            <Ticket className="h-4 w-4 text-zinc-700" />
          </div>

          <p className="mt-3 text-2xl font-bold text-white">
            {counts.all}
          </p>

          <p className="mt-1 text-[11px] text-zinc-700">
            All support requests
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600">
              Open
            </span>

            <CircleDot className="h-4 w-4 text-blue-400" />
          </div>

          <p className="mt-3 text-2xl font-bold text-blue-300">
            {counts.open}
          </p>

          <p className="mt-1 text-[11px] text-zinc-700">
            Waiting for staff
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600">
              In progress
            </span>

            <Clock3 className="h-4 w-4 text-amber-400" />
          </div>

          <p className="mt-3 text-2xl font-bold text-amber-300">
            {counts.in_progress}
          </p>

          <p className="mt-1 text-[11px] text-zinc-700">
            Currently being handled
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600">
              Closed
            </span>

            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>

          <p className="mt-3 text-2xl font-bold text-emerald-300">
            {counts.closed}
          </p>

          <p className="mt-1 text-[11px] text-zinc-700">
            Resolved requests
          </p>
        </div>
      </div>

      {/* TICKET QUEUE */}
      <div>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Ticket Queue
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Search and manage incoming support requests.
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search tickets..."
              className="input pl-10"
            />
          </div>
        </div>

        {/* FILTERS */}
        <div className="mb-5 flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["open", "Open"],
              [
                "in_progress",
                "In Progress",
              ],
              ["closed", "Closed"],
            ] as const
          ).map(
            ([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setFilter(key)
                }
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                  filter === key
                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-600 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {label}

                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    filter === key
                      ? "bg-indigo-500/10 text-indigo-300"
                      : "bg-zinc-800 text-zinc-600"
                  }`}
                >
                  {counts[key]}
                </span>
              </button>
            )
          )}
        </div>

        {/* LIST */}
        {loading ? (
          <div className="card flex min-h-56 items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-zinc-600">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-400" />
              Loading support tickets...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-700">
              <Search className="h-5 w-5" />
            </div>

            <h3 className="mt-4 font-semibold text-zinc-300">
              No tickets found
            </h3>

            <p className="mt-1 text-sm text-zinc-600">
              Try changing the filter or search query.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(
              (ticket) => {
                const category =
                  CATEGORIES[
                    ticket.category
                  ];

                const CategoryIcon =
                  category?.icon ||
                  LifeBuoy;

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() =>
                      setActiveTicket(
                        ticket
                      )
                    }
                    className="card-hover group w-full p-5 text-left"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] text-zinc-700">
                            #
                            {ticket.id.slice(
                              0,
                              8
                            )}
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

                          {category && (
                            <span
                              className={`badge ${category.badge}`}
                            >
                              <CategoryIcon className="h-3.5 w-3.5" />
                              {
                                category.label
                              }
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 truncate font-semibold text-white">
                          {
                            ticket.subject
                          }
                        </h3>

                        <p className="mt-1 text-xs text-zinc-600">
                          by{" "}
                          <span className="text-zinc-400">
                            {
                              ticket.username
                            }
                          </span>
                        </p>

                        <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-zinc-500">
                          {
                            ticket.message
                          }
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center justify-between gap-4 lg:flex-col lg:items-end">
                        <time className="text-[11px] text-zinc-700">
                          {formatDate(
                            ticket.createdAt
                          )}
                        </time>

                        <span className="flex items-center gap-1 text-xs font-semibold text-indigo-400 opacity-70 transition group-hover:opacity-100">
                          Open & reply
                          <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}