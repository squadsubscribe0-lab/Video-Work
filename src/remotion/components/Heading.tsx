import { useRise } from "../anim";
import type { Theme } from "../theme";

export const Heading: React.FC<{ text: string; theme: Theme }> = ({ text, theme }) => {
  const rise = useRise(0, 30);
  return (
    <div style={{ ...rise, fontSize: 72, fontWeight: 800, color: theme.text, letterSpacing: -1, marginBottom: 56 }}>
      {text}
      <div style={{ marginTop: 18, height: 8, width: 140, borderRadius: 4, background: theme.accent }} />
    </div>
  );
};
