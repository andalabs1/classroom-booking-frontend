import { useState } from "react";
import { Button, Empty, Input, Pagination, Select, Segmented } from "antd";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  Building2,
  CalendarDays,
  DoorOpen,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { useDatabase } from "../../services/queries";
import { PageHeader, QueryState } from "../../components/common/Common";
import { RoomCard } from "./RoomCard";
import { equipmentOptions } from "../../constants/bookingStatus";
import styles from "./Rooms.module.css";
export function RoomListPage() {
  const query = useDatabase();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [building, setBuilding] = useState<string>();
  const [capacity, setCapacity] = useState<number>();
  const [status, setStatus] = useState<string>();
  const [floor, setFloor] = useState<number>();
  const [equipment, setEquipment] = useState<string>();
  const [more, setMore] = useState(false);
  const [category, setCategory] = useState("ทั้งหมด");
  const [view, setView] = useState("grid");
  const [sort, setSort] = useState("code");
  const [page, setPage] = useState(1);
  const rooms = query.data?.rooms ?? [];
  const bookings = query.data?.bookings ?? [];
  const busyIds = new Set(
    bookings
      .filter(
        (b) =>
          b.date === dayjs().format("YYYY-MM-DD") &&
          ["PENDING", "APPROVED"].includes(b.status) &&
          b.start <= dayjs().format("HH:mm") &&
          b.end > dayjs().format("HH:mm"),
      )
      .map((b) => b.roomId),
  );
  const filtered = rooms
    .filter(
      (r) =>
        (!search ||
          `${r.name} ${r.code}`.toLowerCase().includes(search.toLowerCase())) &&
        (!building || r.building === building) &&
        (!capacity || r.capacity >= capacity) &&
        (!status ||
          (status === "BUSY" ? busyIds.has(r.id) : r.status === status)) &&
        (!floor || r.floor === floor) &&
        (!equipment || r.equipment.includes(equipment)) &&
        (category === "ทั้งหมด" || r.category === category),
    )
    .sort((a, b) =>
      sort === "capacity"
        ? b.capacity - a.capacity
        : a.code.localeCompare(b.code),
    );
  const hasFilters = Boolean(
    search ||
    building ||
    capacity ||
    status ||
    floor ||
    equipment ||
    category !== "ทั้งหมด",
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 6)),
  );
  const reset = () => {
    setSearch("");
    setBuilding(undefined);
    setCapacity(undefined);
    setStatus(undefined);
    setFloor(undefined);
    setEquipment(undefined);
    setCategory("ทั้งหมด");
    setPage(1);
  };
  return (
    <>
      <PageHeader
        title={t("roomTitle")}
        subtitle="ค้นหาห้องตามอาคาร จำนวนที่นั่ง และอุปกรณ์ แล้วเลือกเวลาที่ต้องการจอง"
        action={
          <Button
            icon={<CalendarDays size={16} />}
            onClick={() => navigate("/room-schedule")}
          >
            ดูตารางการใช้ห้อง
          </Button>
        }
      />
      <div className={styles.welcome}>
        <div>
          <div className={styles.eyebrow}>
            <span /> LEARNING STARTS HERE
          </div>
          <h2>
            ทุกการเรียนรู้ เริ่มต้นที่พื้นที่ดี ๆ <Sparkles size={22} />
          </h2>
          <p>
            เลือกห้องเรียนที่เหมาะกับคุณ เช็กเวลาว่าง แล้วจองได้ในไม่กี่ขั้นตอน
          </p>
          <Button type="primary" onClick={() => navigate("/booking")}>
            จองห้องเรียน <ArrowRight size={16} />
          </Button>
        </div>
        <div className={styles.welcomeArt}>
          <div className={styles.artWindow} />
          <div className={styles.artBoard}>
            <span>
              Make room
              <br />
              for great ideas.
            </span>
            <Sparkles size={25} />
          </div>
          <div className={styles.artBooks}>
            <i />
            <i />
            <i />
          </div>
          <div className={styles.artTable} />
          <div className={styles.artChair} />
        </div>
      </div>
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      >
        <div className={styles.stats}>
          {[
            {
              label: t("allRooms"),
              count: rooms.length,
              icon: DoorOpen,
              color: "purple",
            },
            {
              label: t("available"),
              count: rooms.filter((r) => r.status === "ACTIVE").length,
              icon: Building2,
              color: "green",
            },
            {
              label: t("maintenance"),
              count: rooms.filter((r) => r.status === "MAINTENANCE").length,
              icon: Wrench,
              color: "yellow",
            },
            {
              label: "ที่นั่งทั้งหมด",
              count: rooms.reduce((n, r) => n + r.capacity, 0),
              icon: Users,
              color: "pink",
            },
          ].map((stat) => (
            <div className={styles.stat} key={stat.label}>
              <span className={`${styles.statIcon} ${styles[stat.color]}`}>
                <stat.icon size={21} />
              </span>
              <div>
                <span>{stat.label}</span>
                <strong>
                  {stat.count}
                  <small>{stat.color === "pink" ? "ที่นั่ง" : "ห้อง"}</small>
                </strong>
              </div>
            </div>
          ))}
        </div>
        <section className={styles.catalog}>
          <div className={styles.catalogHeading}>
            <h2>
              ค้นหาห้องเรียน <span>เลือกเงื่อนไขที่ต้องการ</span>
            </h2>
            {hasFilters && (
              <Button type="text" icon={<X size={14} />} onClick={reset}>
                ล้างตัวกรอง
              </Button>
            )}
          </div>
          <div className={styles.filters}>
            <Input
              aria-label="ค้นหาห้องเรียน"
              allowClear
              prefix={<Search size={17} />}
              placeholder={t("search")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Select
              aria-label="อาคาร"
              allowClear
              placeholder="ทุกอาคาร"
              value={building}
              onChange={(v) => {
                setBuilding(v);
                setPage(1);
              }}
              options={[...new Set(rooms.map((r) => r.building))].map(
                (value) => ({ value, label: value }),
              )}
            />
            <Select
              aria-label="จำนวนที่นั่ง"
              allowClear
              placeholder="จำนวนที่นั่ง"
              value={capacity}
              onChange={(v) => {
                setCapacity(v);
                setPage(1);
              }}
              options={[10, 30, 50, 80].map((value) => ({
                value,
                label: `${value} ที่นั่งขึ้นไป`,
              }))}
            />
            <Select
              aria-label="สถานะ"
              allowClear
              placeholder="ทุกสถานะ"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { value: "ACTIVE", label: "พร้อมใช้งาน" },
                { value: "BUSY", label: "มีการใช้งาน" },
                { value: "MAINTENANCE", label: "ปิดปรับปรุง" },
                { value: "INACTIVE", label: "ไม่พร้อมใช้งาน" },
              ]}
            />
            <Button
              aria-label="ตัวกรองเพิ่มเติม"
              aria-expanded={more}
              aria-controls="additional-room-filters"
              icon={<SlidersHorizontal size={17} />}
              onClick={() => setMore(!more)}
              type={more ? "primary" : "default"}
            />
          </div>
          {more && (
            <div className={styles.extraFilters} id="additional-room-filters">
              <Select
                allowClear
                aria-label="ชั้น"
                placeholder="ทุกชั้น"
                value={floor}
                onChange={(v) => {
                  setFloor(v);
                  setPage(1);
                }}
                options={[...new Set(rooms.map((r) => r.floor))]
                  .sort((a, b) => a - b)
                  .map((value) => ({
                    value,
                    label: `ชั้น ${value}`,
                  }))}
              />
              <Select
                allowClear
                aria-label="อุปกรณ์"
                placeholder="อุปกรณ์"
                value={equipment}
                onChange={(v) => {
                  setEquipment(v);
                  setPage(1);
                }}
                options={equipmentOptions.map((value) => ({
                  value,
                  label: value,
                }))}
              />
              <Button type="text" icon={<X size={14} />} onClick={reset}>
                ล้างตัวกรอง
              </Button>
            </div>
          )}
        </section>
        <div className={styles.resultsBar}>
          <div className={styles.tabs}>
            {["ทั้งหมด", "ห้องเรียน", "ห้องปฏิบัติการ", "ห้องประชุม"].map(
              (tab) => (
                <button
                  key={tab}
                  aria-pressed={category === tab}
                  className={category === tab ? styles.selectedTab : ""}
                  onClick={() => {
                    setCategory(tab);
                    setPage(1);
                  }}
                >
                  {tab}
                  {tab === "ทั้งหมด" && <span>{rooms.length}</span>}
                </button>
              ),
            )}
          </div>
          <div className={styles.viewControls}>
            <Select
              aria-label="เรียงลำดับ"
              variant="borderless"
              value={sort}
              onChange={setSort}
              suffixIcon={<ArrowDownWideNarrow size={14} />}
              options={[
                { value: "code", label: "เรียงตามชื่อห้อง" },
                { value: "capacity", label: "ความจุมากที่สุด" },
              ]}
            />
            <Segmented
              value={view}
              onChange={setView}
              options={[
                {
                  value: "grid",
                  icon: <LayoutGrid size={16} aria-label="มุมมองตาราง" />,
                  title: "ตาราง",
                },
                {
                  value: "list",
                  icon: <List size={16} aria-label="มุมมองรายการ" />,
                  title: "รายการ",
                },
              ]}
            />
          </div>
        </div>
        <div className={styles.resultCount} role="status" aria-live="polite">
          พบ <strong>{filtered.length}</strong> ห้องเรียน{" "}
          <span>เลือกห้องเพื่อดูรายละเอียดหรือตรวจสอบตาราง</span>
        </div>
        {filtered.length ? (
          <div
            className={`${styles.roomGrid} ${view === "list" ? styles.listView : ""}`}
          >
            {filtered
              .slice((currentPage - 1) * 6, currentPage * 6)
              .map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  busy={busyIds.has(room.id)}
                />
              ))}
          </div>
        ) : (
          <Empty description="ไม่พบห้องเรียนที่ตรงกับตัวกรอง">
            <Button onClick={reset}>ล้างตัวกรอง</Button>
          </Empty>
        )}
        <div className={styles.pagination}>
          <span>
            แสดง {filtered.length ? (currentPage - 1) * 6 + 1 : 0}–
            {Math.min(currentPage * 6, filtered.length)} จาก {filtered.length}{" "}
            ห้อง
          </span>
          <Pagination
            current={currentPage}
            onChange={setPage}
            total={filtered.length}
            pageSize={6}
            showSizeChanger={false}
          />
        </div>
      </QueryState>
    </>
  );
}
