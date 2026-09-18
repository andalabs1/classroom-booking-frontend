import { useState } from "react";
import type { CSSProperties } from "react";
import { Badge, Button, Drawer, Empty, Segmented, Tooltip } from "antd";
import {
  Bell,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  CircleX,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { notificationsApi } from "../../api/notifications";
import {
  useAction,
  useNotifications,
  useUnreadNotificationCount,
} from "../../services/queries";
import { QueryState } from "../../components/common/Common";
import type { BookingNotification, User } from "../../types";
import styles from "./Notifications.module.css";

export function NotificationBell({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();
  const query = useNotifications({ limit: 100 });
  const unreadQuery = useUnreadNotificationCount();
  const read = useAction(async (id: string | undefined) => {
    if (id) await notificationsApi.markRead(id);
    else await notificationsApi.markAllRead();
  });
  const items = query.data?.items ?? [];
  const unread = unreadQuery.data ?? 0;
  const visible =
    filter === "unread" ? items.filter((item) => !item.readAt) : items;
  const notificationIcon = (item: BookingNotification) => {
    if (item.kind === "APPROVED") return <CircleCheck size={17} />;
    if (item.kind === "REJECTED") return <CircleX size={17} />;
    if (item.kind === "CANCELLED") return <XCircle size={17} />;
    if (item.kind === "REMINDER") return <CalendarClock size={17} />;
    return <Bell size={17} />;
  };
  const openBooking = (item: BookingNotification) => {
    read.mutate(item.id, {
      onSuccess: () => {
        setOpen(false);
        if (item.bookingId)
          navigate(
            `${user.role === "ADMIN" ? "/admin/bookings" : "/booking-history"}?booking=${encodeURIComponent(item.bookingId)}`,
          );
      },
    });
  };
  return (
    <>
      <Tooltip title="การแจ้งเตือน">
        <Badge
          className={unread ? styles.badgeActive : ""}
          count={unread}
          size="small"
          offset={[-5, 5]}
        >
          <Button
            className={unread ? styles.bellActive : ""}
            type="text"
            icon={<Bell size={19} />}
            aria-label={`การแจ้งเตือน${unread ? ` ยังไม่อ่าน ${unread} รายการ` : ""}`}
            aria-expanded={open}
            onClick={() => setOpen(true)}
          />
        </Badge>
      </Tooltip>
      <Drawer
        title="การแจ้งเตือน"
        open={open}
        onClose={() => setOpen(false)}
        size={420}
        className={styles.drawer}
      >
        <div className={styles.tools}>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "ทั้งหมด" },
              { value: "unread", label: `ยังไม่อ่าน (${unread})` },
            ]}
          />
          <Button
            type="text"
            size="small"
            icon={<CheckCheck size={15} />}
            disabled={!unread}
            loading={read.isPending}
            onClick={() => read.mutate(undefined)}
          >
            อ่านทั้งหมด
          </Button>
        </div>
        <QueryState
          isLoading={query.isLoading}
          error={query.error}
          retry={query.refetch}
        >
          {visible.length ? (
            <ul className={styles.list}>
              {visible.map((item, index) => (
                <li
                  key={item.id}
                  style={{ "--notification-index": index } as CSSProperties}
                >
                  <button
                    className={`${styles.item} ${!item.readAt ? styles.unread : ""}`}
                    disabled={read.isPending}
                    onClick={() => openBooking(item)}
                  >
                    <span
                      className={`${styles.icon} ${styles[item.kind.toLowerCase()]}`}
                    >
                      {notificationIcon(item)}
                    </span>
                    <span className={styles.details}>
                      <strong>
                        {item.title}
                        {!item.readAt && (
                          <span
                            className={styles.dot}
                            aria-label="ยังไม่อ่าน"
                          />
                        )}
                      </strong>
                      <span>{item.message}</span>
                      <small>
                        {item.bookingId ?? "แจ้งเตือนระบบ"} ·{" "}
                        {dayjs(item.createdAt).format("DD MMM YYYY HH:mm")}
                      </small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.empty}>
              <Empty
                description={
                  filter === "unread"
                    ? "อ่านการแจ้งเตือนครบแล้ว"
                    : "ยังไม่มีการแจ้งเตือน"
                }
              />
              <p>ข่าวเกี่ยวกับการจองของคุณจะแสดงที่นี่</p>
            </div>
          )}
        </QueryState>
      </Drawer>
    </>
  );
}
