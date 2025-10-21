"use client";
import ExamenFormPro from "@/components/ExamenFormPro";

export default function LaboExamenEdit({ params }:{ params:{ id:string } }){
  return <ExamenFormPro examenId={params.id} afterSavePath="/laboratoire/examens" />;
}
