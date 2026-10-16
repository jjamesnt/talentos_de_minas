import React, { useState, useCallback, useRef } from 'react';
import { useAnimation } from 'framer-motion';
import { RotateCw, Check, Ticket } from 'lucide-react';
import { RoletaWicked } from './RoletaWicked';
import { BilhetesFixaveis } from './BilhetesFixaveis';
import { HistoricoSorteios } from './HistoricoSorteios';
import { useCampanha } from '../../hooks/useCampanha';

// 10 Números Oficiais visíveis nas fatias da roleta da imagem de referência
const NUMEROS_ROLETA = [1192, 23, 856, 78, 312, 66, 815, 1044, 12, 407];

interface PainelSorteioProps {
  onConcluirSelecao: (numeros: number[]) => void;
}

export const PainelSorteio: React.FC<PainelSorteioProps> = ({ onConcluirSelecao }) => {
  const { cotas, precoPorCota } = useCampanha();
  const controls = useAnimation();

  const [quantidade, setQuantidade] = useState(1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [numerosSorteados, setNumerosSorteados] = useState<number[]>([]);
  const [indicesFixados, setIndicesFixados] = useState<number[]>([]);
  const [hasSpunOnce, setHasSpunOnce] = useState(false);
  const [ultimoNumero, setUltimoNumero] = useState<number | null>(null);
  const [historico] = useState<Array<{ numero: number; nome: string }>>([]);

  const rotationRef = useRef(18);

  // Lista de números disponíveis na rifa
  const disponiveis = cotas.filter((c) => c.status === 'disponivel').map((c) => c.numero);

  // Executa o sorteio com física fluida e parada milimétrica no ponteiro superior
  const girarRoleta = useCallback(async () => {
    if (isSpinning || disponiveis.length === 0) return;

    try {
      setIsSpinning(true);

      // Escolhe aleatoriamente uma das 10 fatias da roleta oficial
      const indiceFatiaSorteada = Math.floor(Math.random() * 10);
      const numeroDaFatia = NUMEROS_ROLETA[indiceFatiaSorteada];

      // 6 a 8 voltas completas
      const voltasCompletas = 6 + Math.floor(Math.random() * 3);

      // Ângulo exato para o centro da fatia selecionada parar rigorosamente sob o ponteiro no topo
      // (a fatia 0 tem centro em 18°, fatia 1 em 54°, etc.)
      const anguloCentroFatia = (18 + indiceFatiaSorteada * 36) % 360;
      const anguloAlvo = (360 - anguloCentroFatia) % 360;

      // Delta angular garantindo convergência exata sem desvio residual
      const restoAtual = ((rotationRef.current % 360) + 360) % 360;
      let delta = (anguloAlvo - restoAtual) % 360;
      if (delta < 0) delta += 360;
      if (delta === 0) delta = 360;

      const rotacaoFinal = rotationRef.current + (voltasCompletas * 360) + delta;
      rotationRef.current = rotacaoFinal;

      // Animação com curva de desaceleração suave (4 segundos)
      await controls.start({
        rotate: rotacaoFinal,
        transition: { duration: 4, ease: [0.15, 0, 0.1, 1] },
      });

      // O número oficial da fatia que parou no ponteiro
      setUltimoNumero(numeroDaFatia);

      if (!hasSpunOnce) {
        // Primeiro giro: inclui o número sorteado no ponteiro e completa se quantidade > 1
        const piscinaRestante = disponiveis.filter((n) => n !== numeroDaFatia);
        const aleatoriosExtras = piscinaRestante
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.max(0, quantidade - 1));

        const novosNumeros = [numeroDaFatia, ...aleatoriosExtras].slice(0, quantidade);
        setNumerosSorteados(novosNumeros);
        setHasSpunOnce(true);
      } else {
        // Giros subsequentes: sorteia apenas os que NÃO foram fixados pelo usuário
        const piscina = disponiveis.filter((n) => !numerosSorteados.includes(n));
        const novosAleatorios = piscina.sort(() => 0.5 - Math.random());
        let ponteiroPiscina = 0;

        const atualizados = [...numerosSorteados];
        for (let i = 0; i < quantidade; i++) {
          if (!indicesFixados.includes(i)) {
            atualizados[i] = novosAleatorios[ponteiroPiscina++] || atualizados[i];
          }
        }
        setNumerosSorteados(atualizados);
      }
    } catch (err) {
      console.error('Erro na animação da roleta:', err);
    } finally {
      setIsSpinning(false);
    }
  }, [isSpinning, disponiveis, controls, hasSpunOnce, quantidade, numerosSorteados, indicesFixados]);

  const toggleFixar = (idx: number) => {
    setIndicesFixados((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleConfirmar = () => {
    if (numerosSorteados.length > 0) {
      onConcluirSelecao(numerosSorteados);
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden p-4 sm:p-8 border border-white/10 bg-gradient-to-b from-[#0F3D2A]/20 via-[#0A0A0A] to-[#0A0A0A] shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col items-center gap-6">
      {/* Controles de Quantidade */}
      <div className="w-full max-w-xl flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-[#00FF88]" />
          <span className="text-xs sm:text-sm font-semibold text-slate-200">
            Quantidade de Bilhetes:
          </span>
        </div>

        {/* Stepper e Atalhos */}
        <div className="flex items-center gap-2">
          {[1, 3, 5, 10].map((qtd) => (
            <button
              key={qtd}
              type="button"
              disabled={isSpinning}
              onClick={() => {
                setQuantidade(qtd);
                setHasSpunOnce(false);
                setNumerosSorteados([]);
                setIndicesFixados([]);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quantidade === qtd
                  ? 'bg-[#00FF88] text-black shadow-[0_0_12px_rgba(0,255,136,0.5)]'
                  : 'bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10'
              }`}
            >
              {qtd} {qtd === 1 ? 'Cota' : 'Cotas'}
            </button>
          ))}
        </div>

        <span className="w-full sm:w-auto text-right text-xs font-mono font-bold text-[#D4AF37]">
          Total: R$ {(quantidade * precoPorCota).toFixed(2).replace('.', ',')}
        </span>
      </div>

      {/* A Roleta Wicked Idêntica à Referência */}
      <RoletaWicked
        controls={controls}
        isSpinning={isSpinning}
        onGirarClick={girarRoleta}
      />

      {/* Grid de Bilhetes Sorteados com Função de Fixação (Lock/Pin) */}
      <BilhetesFixaveis
        numerosSorteados={numerosSorteados}
        indicesFixados={indicesFixados}
        onToggleFix={toggleFixar}
        isSpinning={isSpinning}
      />

      {/* Botões de Ação */}
      <div className="w-full max-w-md flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={girarRoleta}
          disabled={isSpinning}
          className={`flex-1 py-3.5 px-6 rounded-2xl font-cinzel text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
            hasSpunOnce
              ? 'bg-transparent border-2 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10'
              : 'bg-gradient-to-r from-[#D4AF37] via-[#00FF88] to-[#D4AF37] text-black hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.4)]'
          }`}
        >
          <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
          <span>{isSpinning ? 'Girando Roleta...' : hasSpunOnce ? 'Girar Restantes' : 'Girar Roleta da Sorte'}</span>
        </button>

        {hasSpunOnce && !isSpinning && (
          <button
            type="button"
            onClick={handleConfirmar}
            className="flex-1 py-3.5 px-6 rounded-2xl font-cinzel text-xs font-bold tracking-wider uppercase bg-[#00FF88] hover:bg-[#00E575] text-black shadow-[0_0_20px_rgba(0,255,136,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Garantir Bilhetes</span>
          </button>
        )}
      </div>

      {/* Displays Inferiores: Último Número Sorteado e Histórico de Sorteios */}
      <div className="w-full max-w-2xl">
        <HistoricoSorteios
          ultimoNumeroSorteado={ultimoNumero}
          historico={historico}
        />
      </div>
    </div>
  );
};
