import { ComingSoon } from "@/components/health/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Visual Regression"
      note="The existing screenshots/YYYY-MM/ archive is the baseline source; a diffing pass against fresh Quick Scan captures for homepage, Education, Wholesale, and Contact is next."
    />
  );
}
