import VisiteEdit from "@/components/modules/VisiteEdit";

export default function Page({ params }: { params: Record<string, string> }) {
  // Rendre robuste selon le nom réel du dossier dynamique
  const id =
    params.id ??
    params.visiteId ??
    params.visite_id ??
    "";

  return <VisiteEdit id={id} />;
}