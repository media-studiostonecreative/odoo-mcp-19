import { ComingSoon } from "@/components/health/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Accessibility"
      note="axe-core is now installed in this project — wiring an automated pass (heading structure, alt text, ARIA, contrast) into Quick Scan is next. Automated scanning will never be presented as a complete legal accessibility audit."
    />
  );
}
