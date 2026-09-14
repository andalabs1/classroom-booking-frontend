// Reference photography for the synthetic room catalogue. See README image credits.
export const roomImages = [
  "https://vluwebmedia.s3.ap-southeast-1.amazonaws.com/VLU_2123_63ab704d5b.jpg",
  "https://www.akh.de/fileadmin/_processed_/f/6/csm_interior_view2_4ba73e152a.jpg",
  "https://www.fms.psu.ac.th/media/2020/05/Lap_03-1.jpg",
  "https://vluwebmedia.s3.ap-southeast-1.amazonaws.com/VLU_2123_63ab704d5b.jpg",
  "https://www.iwate-uhms.ac.jp/outline/campusguide/img/faci_05.jpg",
  "https://sga.ua.es/es/subdireccion-espacios-docentes/imagenes/ficha-aula/0702/0702p2062/ed-taller-7-02.jpg",
];
const legacyPhotos = [
  "photo-1497486751825-1233686d5d80",
  "photo-1509062522246-3755977927d7",
  "photo-1523050854058-8df90110c9f1",
  "photo-1580582932707-520aed937b7b",
  "photo-1524178232363-1fb2b075b655",
  "photo-1516321318423-f06f85e504b3",
];
export function migrateRoomImage(image: string): string {
  const index = legacyPhotos.findIndex(
    (id) =>
      image ===
      `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=85`,
  );
  return index < 0 ? image : roomImages[index];
}
