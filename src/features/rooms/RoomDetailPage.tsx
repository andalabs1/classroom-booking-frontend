import { RoomImage } from "../../components/common/RoomImage";
import { Button, Result, Space } from "antd";
import { CalendarDays, CalendarPlus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useClassroom } from "../../services/queries";
import { PageHeader, Panel, QueryState } from "../../components/common/Common";
import { RoomStatusTag } from "../../components/data-display/StatusTags";
import { getEquipmentLabel } from "../../constants/bookingStatus";
import styles from "./Rooms.module.css";
export function RoomDetailPage() {
  const { roomId } = useParams();
  const query = useClassroom(roomId);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const room = query.data;
  return (
    <QueryState
      isLoading={query.isLoading}
      error={query.error}
      retry={query.refetch}
    >
      {room ? (
        <>
          <PageHeader
            back
            title={`${room.name} ${room.code}`}
            subtitle={t("roomScheduleBuildingFloor", { building: room.building, floor: room.floor, capacity: room.capacity })}
            action={<RoomStatusTag status={room.status} />}
          />
          <RoomImage
            className={styles.detailHero}
            src={room.image}
            alt={room.name}
          />
          <div className={styles.detailGrid}>
            <Panel>
              <h2>{t("roomAbout")}</h2>
              <p className={styles.detailText}>{room.description}</p>
              <div className={styles.detailInfo}>
                <span>{t("roomBuilding", { building: room.building })}</span>
                <span>{t("roomFloor", { floor: room.floor })}</span>
                <span>{t("roomCapacity", { count: room.capacity })}</span>
              </div>
              <h3>{t("roomEquipmentTitle")}</h3>
              <div className={styles.detailEquipment}>
                {room.equipment.map((e) => (
                  <span key={e}>{getEquipmentLabel(t, e)}</span>
                ))}
              </div>
            </Panel>
            <Panel>
              <h2>{t("roomPlanTitle")}</h2>
              <p className={styles.detailText}>
                {t("roomBookingHours")}
                <br />
                {t("roomApprovalInfo")}
              </p>
              <Space orientation="vertical" style={{ width: "100%" }}>
                <Button
                  block
                  icon={<CalendarDays size={16} />}
                  onClick={() => navigate(`/room-schedule?room=${room.id}`)}
                >
                  {t("roomViewSchedule")}
                </Button>
                <Button
                  block
                  type="primary"
                  disabled={room.status !== "ACTIVE"}
                  icon={<CalendarPlus size={16} />}
                  onClick={() => navigate(`/booking?room=${room.id}`)}
                >
                  {t("roomBookThis")}
                </Button>
              </Space>
            </Panel>
          </div>
        </>
      ) : (
        <Result
          status="404"
          title={t("roomNotFound")}
          extra={
            <Button onClick={() => navigate("/rooms")}>
              {t("roomBack")}
            </Button>
          }
        />
      )}
    </QueryState>
  );
}
