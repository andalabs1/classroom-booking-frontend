import { Providers } from "./providers";
import { ApplicationRouter } from "./router";
/**
 * ประกอบ provider กลางและ router เป็น root component ของแอป
 */
export function App() {
  return (
    <Providers>
      <ApplicationRouter />
    </Providers>
  );
}
