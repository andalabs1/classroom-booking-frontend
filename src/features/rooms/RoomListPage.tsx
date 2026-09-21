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
import { useClassrooms, useClassroomsAvailability } from "../../services/queries";
import { PageHeader, QueryState } from "../../components/common/Common";
import { RoomCard } from "./RoomCard";
import { equipmentOptions } from "../../constants/bookingStatus";
import styles from "./Rooms.module.css";
export function RoomListPage() {
  const query = useClassrooms({ limit: 100 });
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
  const rooms = query.data?.items ?? [];
  const categoryLabels: Record<string, string> = {
    "ทั้งหมด": t("roomsCategoryAll"),
    "ห้องเรียน": t("roomsCategoryClassroom"),
    "ห้องปฏิบัติการ": t("roomsCategoryLab"),
    "ห้องประชุม": t("roomsCategoryMeeting"),
  };
  const now = dayjs();
  const availabilityQuery = useClassroomsAvailability(
    rooms.length
      ? {
          startAt: now.startOf("hour").toISOString(),
          endAt: now.startOf("hour").add(1, "hour").toISOString(),
          classroomIds: rooms.map((room) => room.id),
        }
      : undefined,
  );
  const busyIds = new Set(
    availabilityQuery.data?.rooms
      .filter((room) => !room.available)
      .map((room) => room.id),
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
        subtitle={t("roomsSubtitle")}
        action={
          <Button
            icon={<CalendarDays size={16} />}
            onClick={() => navigate("/room-schedule")}
          >
            {t("roomsSchedule")}
          </Button>
        }
      />
      <div className={styles.welcome}>
        <div>
          <div className={styles.eyebrow}>
            <span /> {t("roomsWelcomeKicker")}
          </div>
          <h2>
            {t("roomsWelcomeTitle")} <Sparkles size={22} />
          </h2>
          <p>
            {t("roomsWelcomeDescription")}
          </p>
          <Button type="primary" onClick={() => navigate("/booking")}>
            {t("roomsWelcomeAction")} <ArrowRight size={16} />
          </Button>
        </div>
        <div className={styles.welcomeArt}>
          <div className={styles.artWindow} />
          <div className={styles.artBoard}>
            <span>
              {t("roomsMakeRoom")}
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
        isLoading={query.isLoading || availabilityQuery.isLoading}
        error={query.error ?? availabilityQuery.error}
        retry={() => {
          void query.refetch();
          void availabilityQuery.refetch();
        }}
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
              label: t("roomsTotalSeats"),
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
                  <small>{stat.color === "pink" ? t("roomsSeatsSuffix") : t("roomsRoomsSuffix")}</small>
                </strong>
              </div>
            </div>
          ))}
        </div>
        <section className={styles.catalog}>
          <div className={styles.catalogHeading}>
            <h2>
              {t("roomsFindTitle")} <span>{t("roomsFindSubtitle")}</span>
            </h2>
            {hasFilters && (
              <Button type="text" icon={<X size={14} />} onClick={reset}>
                {t("roomsResetFilters")}
              </Button>
            )}
          </div>
          <div className={styles.filters}>
            <Input
              aria-label={t("roomsSearchAria")}
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
              aria-label={t("roomsBuilding")}
              allowClear
              placeholder={t("roomsAllBuildings")}
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
              aria-label={t("roomsCapacity")}
              allowClear
              placeholder={t("roomsCapacityPlaceholder")}
              value={capacity}
              onChange={(v) => {
                setCapacity(v);
                setPage(1);
              }}
              options={[10, 30, 50, 80].map((value) => ({
                value,
                label: t("roomsMinimumSeats", { count: value }),
              }))}
            />
            <Select
              aria-label={t("roomsStatus")}
              allowClear
              placeholder={t("roomsAllStatuses")}
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { value: "ACTIVE", label: t("roomsStatusActive") },
                { value: "BUSY", label: t("roomsStatusBusy") },
                { value: "MAINTENANCE", label: t("roomsStatusMaintenance") },
                { value: "INACTIVE", label: t("roomsStatusInactive") },
              ]}
            />
            <Button
              aria-label={t("roomsMoreFilters")}
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
                aria-label={t("roomsFloor")}
                placeholder={t("roomsAllFloors")}
                value={floor}
                onChange={(v) => {
                  setFloor(v);
                  setPage(1);
                }}
                options={[...new Set(rooms.map((r) => r.floor))]
                  .sort((a, b) => a - b)
                  .map((value) => ({
                    value,
                    label: t("roomsFloorOption", { floor: value }),
                  }))}
              />
              <Select
                allowClear
                aria-label={t("roomsEquipment")}
                placeholder={t("roomsEquipmentPlaceholder")}
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
                {t("roomsResetFilters")}
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
                  {categoryLabels[tab]}
                  {tab === "ทั้งหมด" && <span>{rooms.length}</span>}
                </button>
              ),
            )}
          </div>
          <div className={styles.viewControls}>
            <Select
              aria-label={t("roomsSort")}
              variant="borderless"
              value={sort}
              onChange={setSort}
              suffixIcon={<ArrowDownWideNarrow size={14} />}
              options={[
                { value: "code", label: t("roomsSortCode") },
                { value: "capacity", label: t("roomsSortCapacity") },
              ]}
            />
            <Segmented
              value={view}
              onChange={setView}
              options={[
                {
                  value: "grid",
                  icon: <LayoutGrid size={16} aria-label={t("roomsGridViewAria")} />,
                  title: t("roomsGridView"),
                },
                {
                  value: "list",
                  icon: <List size={16} aria-label={t("roomsListViewAria")} />,
                  title: t("roomsListView"),
                },
              ]}
            />
          </div>
        </div>
        <div className={styles.resultCount} role="status" aria-live="polite">
          {t("roomsFound", { count: filtered.length })}{" "}
          <span>{t("roomsFoundDescription")}</span>
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
          <Empty description={t("roomsEmpty")}>
            <Button onClick={reset}>{t("roomsResetFilters")}</Button>
          </Empty>
        )}
        <div className={styles.pagination}>
          <span>
            {t("roomsShowing", {
              from: filtered.length ? (currentPage - 1) * 6 + 1 : 0,
              to: Math.min(currentPage * 6, filtered.length),
              total: filtered.length,
            })}
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
