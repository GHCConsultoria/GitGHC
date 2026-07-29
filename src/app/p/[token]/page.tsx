import { notFound } from "next/navigation";
import { buscarPacientePorToken, buscarRegistrosDeHoje } from "@/lib/nutri/consultas";
import { calcularSaldoDoDia } from "@/lib/nutri/aderencia";
import { ConsentimentoPaciente } from "@/components/nutri/ConsentimentoPaciente";
import { RegistroPaciente } from "@/components/nutri/RegistroPaciente";

export const dynamic = "force-dynamic";

const FORMATADOR_HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function PaginaPaciente({ params }: { params: { token: string } }) {
  const paciente = await buscarPacientePorToken(params.token);
  if (!paciente) {
    notFound();
  }

  if (!paciente.consentimentoEm) {
    return <ConsentimentoPaciente token={paciente.tokenAcesso} nomePaciente={paciente.nome} />;
  }

  const registros = await buscarRegistrosDeHoje(paciente.id);
  const saldo = calcularSaldoDoDia(registros, paciente);

  return (
    <RegistroPaciente
      token={paciente.tokenAcesso}
      nomePaciente={paciente.nome}
      saldo={saldo}
      registros={registros.map((registro) => ({
        id: registro.id,
        entradaBruta: registro.entradaBruta,
        kcal: registro.kcal,
        proteina: registro.proteina,
        carbo: registro.carbo,
        gordura: registro.gordura,
        confianca: registro.confianca,
        horario: FORMATADOR_HORA.format(registro.registradoEm),
      }))}
    />
  );
}
