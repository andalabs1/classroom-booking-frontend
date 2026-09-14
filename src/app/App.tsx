import { Providers } from "./providers";
import { ApplicationRouter } from "./router";
export function App() {
  return (
    <Providers>
      <ApplicationRouter />
    </Providers>
  );
}
