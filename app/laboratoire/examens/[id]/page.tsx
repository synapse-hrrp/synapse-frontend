"use client";
import ExamenShow from "@/components/modules/ExamenShow";

export default function LaboExamenShow({ params }:{ params:{ id:string } }){
  return <ExamenShow id={params.id} contextLabel="Laboratoire" basePath="/laboratoire/examens" />;
}
