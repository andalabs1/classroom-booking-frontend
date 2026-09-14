import { RoomImage } from "../../components/common/RoomImage";
import { Button, Tooltip } from "antd";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Monitor,
  Projector,
  Users,
  Wifi,
  Wind,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Room } from "../../types";
import { RoomStatusTag } from "../../components/data-display/StatusTags";
import styles from "./Rooms.module.css";
export function RoomCard({ room, busy }: { room: Room; busy?: boolean }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <article className={styles.roomCard}>
      <Link className={styles.roomImage} to={`/rooms/${room.id}`}>
        <RoomImage
          src={room.image}
          alt={`${room.name} ${room.code}`}
          loading="lazy"
        />
        <span className={styles.imageStatus}>
          <RoomStatusTag status={room.status} busy={busy} />
        </span>
        <span className={styles.imageCode}>{room.code}</span>
      </Link>
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>
          <Link to={`/rooms/${room.id}`}>
            <h3>
              {room.name} {room.code}
            </h3>
          </Link>
          <ArrowUpRight size={16} />
        </div>
        <p className={styles.roomLocation}>
          <Building2 size={14} />
          {room.building}
          <span>•</span>ชั้น {room.floor}
        </p>
        <div className={styles.roomCapacity}>
          <Users size={15} />
          <span>
            ความจุ <strong>{room.capacity}</strong> ที่นั่ง
          </span>
        </div>
        <div className={styles.equipment}>
          {room.equipment.slice(0, 3).map((item) => {
            const Icon =
              item === "Wi-Fi"
                ? Wifi
                : item === "Air Conditioner"
                  ? Wind
                  : item === "Projector"
                    ? Projector
                    : Monitor;
            return (
              <span key={item}>
                <Icon size={12} />
                {item}
              </span>
            );
          })}
          <Tooltip title={room.equipment.slice(3).join(", ")}>
            <span>+{room.equipment.length - 3}</span>
          </Tooltip>
        </div>
        <div className={styles.cardActions}>
          <Button type="text" onClick={() => navigate(`/rooms/${room.id}`)}>
            {t("details")}
          </Button>
          <div>
            <Tooltip title="ดูตาราง">
              <Button
                aria-label={`ดูตาราง ${room.code}`}
                icon={<CalendarDays size={16} />}
                onClick={() => navigate(`/room-schedule?room=${room.id}`)}
              />
            </Tooltip>
            <Button
              type="primary"
              disabled={room.status !== "ACTIVE"}
              onClick={() => navigate(`/booking?room=${room.id}`)}
            >
              {t("book")}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
