import { ChangeEvent, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clipboard, Download, FileJson, Sparkles, Upload } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import '../styles/ai-workout-import.css'
import { importWorkoutJson } from '../lib'

type ImportResult={name:string;ok:boolean;message:string}

const AI_PROMPT=`Você será meu especialista em treinamento físico e também responsável por gerar arquivos JSON compatíveis com o aplicativo LIFTY.

Junto com esta conversa, vou fornecer um arquivo JSON exportado pelo LIFTY. Esse arquivo é o MODELO OFICIAL DE ESTRUTURA e deve ser utilizado como referência obrigatória para qualquer arquivo JSON que você gerar.

## OBJETIVO

Sua função será:

1. entender o treino que eu quero;
2. me orientar na definição e montagem do treino;
3. propor um programa tecnicamente coerente;
4. organizar o treino segundo a estrutura híbrida do LIFTY;
5. apresentar o treino de forma clara para minha avaliação;
6. fazer os ajustes que eu solicitar;
7. somente depois da minha aprovação, gerar o arquivo JSON compatível com o LIFTY.

## PRIMEIRA ETAPA — ENTENDER O USUÁRIO

Antes de montar o treino, analise as informações que eu fornecer.

Caso informações importantes estejam faltando, ajude-me a definir o treino considerando, quando pertinente:

- objetivo principal;
- quantidade de treinos por semana;
- duração aproximada disponível por treino;
- nível de experiência;
- local de treinamento;
- equipamentos disponíveis;
- exercícios que gosto ou prefiro evitar;
- limitações relevantes informadas por mim;
- preferência por musculação, cardio, treino intervalado ou combinação dessas modalidades.

Não transforme essa etapa em um questionário desnecessariamente longo. Pergunte apenas o que realmente for necessário para criar um treino coerente. Se as informações que eu fornecer já forem suficientes, monte diretamente uma proposta.

## ESTRUTURA DE TREINOS DO LIFTY

O LIFTY utiliza TREINOS HÍBRIDOS. Um mesmo treino pode possuir vários subblocos, e cada subbloco possui um modelo próprio.

Os modelos disponíveis são:
- Resistido
- Cardio
- Intervalado

Exemplo de um treino:
Aquecimento — Cardio
Musculação — Resistido
HIIT final — Intervalado
Alongamento — Intervalado ou outro formato compatível com o modelo fornecido

Não classifique obrigatoriamente o treino inteiro como musculação, cardio ou intervalado. A classificação ocorre principalmente nos subblocos.

## SUBBLOCO RESISTIDO

Pode conter informações planejadas como exercícios, número de séries, repetições, ordem dos exercícios e demais parâmetros presentes no JSON modelo.

IMPORTANTE: NUNCA inclua carga planejada no treino-base. As cargas são registradas pelo usuário somente durante a execução do treino no LIFTY.

## SUBBLOCO CARDIO

Pode conter caminhada, corrida, bicicleta, remo, elíptico e outras atividades compatíveis. Utilize os campos de tempo, distância ou demais parâmetros exatamente conforme a estrutura encontrada no JSON modelo.

## SUBBLOCO INTERVALADO

O LIFTY pode trabalhar com modelos como Tabata, EMOM, AMRAP e Personalizado. Cada subbloco intervalado possui sua própria configuração.

Conforme o modelo e a estrutura do arquivo fornecido, podem existir informações como número de ciclos ou rodadas, duração, descanso entre ciclos, tempo de trabalho de cada exercício, tempo de descanso de cada exercício e repetições alvo.

Quando houver descanso entre ciclos, o último exercício de cada ciclo não deverá possuir um descanso adicional próprio após sua execução, se essa for a lógica demonstrada pelo JSON modelo.

## REGRA FUNDAMENTAL SOBRE O JSON MODELO

Antes de gerar qualquer arquivo:
1. analise completamente o JSON fornecido;
2. identifique formatVersion;
3. identifique a estrutura externa obrigatória do arquivo;
4. identifique os nomes exatos das propriedades;
5. identifique os valores aceitos para tipos, modelos e enums;
6. identifique quais campos são obrigatórios e quais são opcionais;
7. identifique como os IDs são representados;
8. identifique como subblocos e exercícios são estruturados;
9. identifique como a ordem dos elementos é armazenada.

O JSON fornecido pelo LIFTY é a FONTE DE VERDADE. Não invente uma estrutura diferente. Não traduza valores internos utilizados pelo sistema.

Por exemplo, se o modelo utilizar internamente resistance, cardio e interval, mantenha exatamente esses valores. Não substitua por traduções se isso alterar o formato esperado pelo sistema.

## COMPATIBILIDADE

O arquivo final deve:
- utilizar a mesma estrutura externa do JSON modelo;
- manter app, kind, formatVersion e demais propriedades obrigatórias exatamente conforme o modelo;
- utilizar tipos de dados compatíveis;
- conter todos os campos obrigatórios;
- evitar campos inexistentes no modelo;
- utilizar IDs novos e consistentes quando necessário;
- manter a ordem correta dos subblocos e exercícios;
- ser um JSON válido;
- não conter comentários;
- não conter Markdown;
- não conter texto antes ou depois do JSON.

Não utilize undefined. Utilize null somente se o modelo demonstrar que esse valor é permitido.

## EXERCÍCIOS

Prefira nomes completos, claros e convencionais. Ao montar o treino, considere equilíbrio entre grupos musculares, volume, frequência, recuperação e objetivo informado pelo usuário. Se houver várias sessões semanais, distribua os exercícios de maneira coerente entre elas. Não escolha exercícios apenas para preencher a estrutura do arquivo. A qualidade do programa de treinamento é tão importante quanto a compatibilidade do JSON.

## FLUXO DE TRABALHO

Primeiro, converse comigo e monte o treino. Apresente-o de forma organizada e fácil de revisar, mostrando nome do treino, subblocos, modelo de cada subbloco, exercícios, séries, repetições, tempos, distâncias, ciclos, descansos e demais parâmetros relevantes.

Depois pergunte se desejo alterar o treino ou gerar o JSON. NÃO gere o arquivo JSON antes da minha aprovação.

## GERAÇÃO FINAL

Depois que eu aprovar o treino:
1. revise novamente o JSON modelo fornecido;
2. valide a estrutura do treino;
3. valide todos os campos obrigatórios;
4. confirme internamente que a estrutura externa segue o padrão do LIFTY;
5. gere um novo JSON compatível.

Se sua plataforma permitir criar arquivos, entregue um arquivo com extensão .json. Caso não seja possível criar arquivos, apresente exclusivamente o conteúdo JSON, sem explicações adicionais ao redor.

Nunca substitua o modelo oficial por uma estrutura criada por você. Se alguma instrução deste prompt entrar em conflito com a estrutura encontrada no JSON modelo, preserve a estrutura do JSON modelo.`

async function copyText(text:string){
 try{await navigator.clipboard.writeText(text);return true}catch{
  const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();const ok=document.execCommand('copy');area.remove();return ok
 }
}

export default function AiWorkoutImportPage(){
 const[copied,setCopied]=useState(false)
 const[results,setResults]=useState<ImportResult[]>([])
 const[importing,setImporting]=useState(false)

 async function copyPrompt(){const ok=await copyText(AI_PROMPT);if(ok){setCopied(true);window.setTimeout(()=>setCopied(false),2200)}else alert('Não foi possível copiar automaticamente. Selecione o texto do prompt e copie manualmente.')}

 async function importFiles(e:ChangeEvent<HTMLInputElement>){
  const files=Array.from(e.target.files||[]);e.target.value='';if(!files.length)return
  setImporting(true);const next:ImportResult[]=[]
  for(const file of files){try{await importWorkoutJson(file);next.push({name:file.name,ok:true,message:'Treino importado'})}catch(err){next.push({name:file.name,ok:false,message:err instanceof Error?err.message:'Arquivo inválido ou incompatível'})}}
  setResults(next);setImporting(false)
 }

 const success=results.filter(r=>r.ok).length
 const failed=results.length-success
 return <div className="page ai-import-page">
  <PageHeader title="IA Treino Import" subtitle="Crie seu treino com inteligência artificial e importe para o LIFTY"/>

  <section className="card ai-hero">
   <Sparkles className="lime-icon" size={28}/>
   <div><h2>Crie seu treino com IA</h2><p>Use ChatGPT, Gemini, Claude ou outra IA para montar um treino de acordo com seus objetivos, experiência, equipamentos disponíveis, frequência semanal e preferências.</p></div>
  </section>

  <section className="card ai-step">
   <div className="ai-step-title"><span>1</span><div><h2>Prepare sua IA</h2><p>Copie o prompt e envie-o para a IA junto com o arquivo JSON modelo do LIFTY.</p></div></div>
   <div className="ai-action-grid">
    <button className="primary full" onClick={()=>void copyPrompt()}>{copied?<CheckCircle2 size={18}/>:<Clipboard size={18}/>} {copied?'Prompt copiado':'Copiar prompt para IA'}</button>
    <a className="secondary full button-link" href={`${import.meta.env.BASE_URL}modelo-json-lifty-para-ia.json`} download="modelo-json-lifty-para-ia.json"><Download size={18}/>Baixar JSON modelo LIFTY</a>
   </div>
   <details className="prompt-preview"><summary>Ver prompt completo</summary><pre>{AI_PROMPT}</pre></details>
   <div className="info-note"><FileJson size={18}/><span>O arquivo modelo serve apenas para ensinar à IA a estrutura compatível com o LIFTY. Ele não contém seu histórico de treinos nem seus dados pessoais.</span></div>
  </section>

  <section className="card ai-step">
   <div className="ai-step-title"><span>2</span><div><h2>Monte o treino na IA</h2><p>A IA deverá ajudá-lo a definir o treino, apresentar a proposta para sua avaliação e gerar o JSON somente depois da sua aprovação.</p></div></div>
   <p className="muted-copy">Revise exercícios, séries, repetições, tempos e demais parâmetros antes de importar. A IA deve seguir o arquivo modelo como fonte de verdade para a estrutura técnica.</p>
  </section>

  <section className="card ai-step">
   <div className="ai-step-title"><span>3</span><div><h2>Importe para o LIFTY</h2><p>Selecione um ou vários arquivos JSON de treino de uma só vez.</p></div></div>
   <label className={`primary full upload-button ai-upload ${importing?'disabled':''}`}><Upload size={18}/>{importing?'Importando...':'Importar um ou mais treinos JSON'}<input type="file" accept="application/json,.json" multiple disabled={importing} onChange={e=>void importFiles(e)}/></label>
   {results.length>0&&<div className="import-summary"><strong>Importação concluída</strong><span>{results.length} arquivo(s) analisado(s) • {success} importado(s){failed?` • ${failed} incompatível(is)`:''}</span><div className="import-result-list">{results.map((r,i)=><div key={`${r.name}-${i}`} className={r.ok?'ok':'error'}>{r.ok?<CheckCircle2 size={16}/>:<AlertTriangle size={16}/>}<div><b>{r.name}</b><small>{r.message}</small></div></div>)}</div></div>}
  </section>
 </div>
}
