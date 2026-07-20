import Link from "next/link";
import { Zap } from "lucide-react";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link className="brand" href="/" style={{ color: inverse ? "white" : undefined }}><span className="brand-mark"><Zap size={17} fill="currentColor" /></span>Lajurin</Link>;
}
