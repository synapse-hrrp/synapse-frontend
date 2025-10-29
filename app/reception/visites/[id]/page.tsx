import VisiteShow from "@/components/modules/VisiteShow";

export default function Page({ params }: { params: { id: string } }) {
  return <VisiteShow visiteId={params.id} />;
}
