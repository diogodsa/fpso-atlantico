import type { Metadata } from "next";
import SupplyChain from "../supply-chain";
export const metadata: Metadata = { title: "Supply chain | Offshore Explorer", description: "Explore a mobilização de equipes por helicóptero e de materiais por embarcação para uma atividade de pintura no FPSO." };
export default function SupplyChainPage() { return <SupplyChain />; }
