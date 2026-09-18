import { RoomImage } from "../../components/common/RoomImage";
import { Button, Result, Space } from "antd";
import { CalendarDays, CalendarPlus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useClassroom } from "../../services/queries";
import { PageHeader, Panel, QueryState } from "../../components/common/Common";
import { RoomStatusTag } from "../../components/data-display/StatusTags";
import styles from "./Rooms.module.css";
export function RoomDetailPage() {
  const { roomId } = useParams();
  const query = useClassroom(roomId);
  const navigate = useNavigate();
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
            subtitle={`${room.building} · ชั้น ${room.floor}`}
            action={<RoomStatusTag status={room.status} />}
          />
          <RoomImage
            className={styles.detailHero}
            src={room.image}
            alt={room.name}
          />
          <div className={styles.detailGrid}>
            <Panel>
              <h2>เกี่ยวกับห้องเรียน</h2>
              <p className={styles.detailText}>{room.description}</p>
              <div className={styles.detailInfo}>
                <span>อาคาร: {room.building}</span>
                <span>ชั้น {room.floor}</span>
                <span>ความจุ {room.capacity} ที่นั่ง</span>
              </div>
              <h3>อุปกรณ์และสิ่งอำนวยความสะดวก</h3>
              <div className={styles.detailEquipment}>
                {room.equipment.map((e) => (
                  <span key={e}>{e}</span>
                ))}
              </div>
            </Panel>
            <Panel>
              <h2>วางแผนการใช้ห้อง</h2>
              <p className={styles.detailText}>
                เปิดให้จอง 08:00–20:00 น.
                <br />
                กรุณารอการอนุมัติก่อนเข้าใช้งาน
              </p>
              <Space orientation="vertical" style={{ width: "100%" }}>
                <Button
                  block
                  icon={<CalendarDays size={16} />}
                  onClick={() => navigate(`/room-schedule?room=${room.id}`)}
                >
                  ดูตารางห้อง
                </Button>
                <Button
                  block
                  type="primary"
                  disabled={room.status !== "ACTIVE"}
                  icon={<CalendarPlus size={16} />}
                  onClick={() => navigate(`/booking?room=${room.id}`)}
                >
                  จองห้องนี้
                </Button>
              </Space>
            </Panel>
          </div>
        </>
      ) : (
        <Result
          status="404"
          title="ไม่พบห้องเรียน"
          extra={
            <Button onClick={() => navigate("/rooms")}>
              กลับหน้าห้องเรียน
            </Button>
          }
        />
      )}
    </QueryState>
  );
}
