import { useState, useEffect, useCallback, useRef } from 'react';
import { Gamepad2 } from 'lucide-react';
import { TicTacToe, checkWinner } from './TicTacToe';
import { RockPaperScissors, getRPSResult } from './RockPaperScissors';
import { TruthDare } from './TruthDare';
import { WouldYouRather, getRandomWYR } from './WouldYouRather';
import { ConnectFour, checkConnect4Winner, createEmptyBoard, dropPiece } from './ConnectFour';
import { GridSnake } from './GridSnake';
import type { WebSocketMessage, GameType } from '@/types/chat';

type TTTCell = 'X' | 'O' | null;
type C4Cell = 'R' | 'Y' | null;

interface GameOverlayProps {
    sendGameMessage: (type: string, game: string, data?: unknown) => void;
    setGameHandler: (handler: ((msg: WebSocketMessage) => void) | null) => void;
    isMatched: boolean;
    onPartnerDisconnect: boolean;
    partnerId: string | null;
}

type GameState =
    | { phase: 'idle' }
    | { phase: 'menu' }
    | { phase: 'invite_sent'; game: GameType }
    | { phase: 'invite_received'; game: GameType }
    | { phase: 'playing'; game: GameType };

const GAME_NAMES: Record<GameType, string> = {
    tictactoe: 'Tic-Tac-Toe',
    rps: 'Rock Paper Scissors',
    truthdare: 'Truth or Dare',
    wyr: 'Would You Rather',
    connect4: 'Connect Four',
    snake: 'Grid Snake',
};

export function GameOverlay({ sendGameMessage, setGameHandler, isMatched, onPartnerDisconnect, partnerId }: GameOverlayProps) {
    const [gameState, setGameState] = useState<GameState>({ phase: 'idle' });

    // TTT state
    const [tttBoard, setTttBoard] = useState<TTTCell[]>(Array(9).fill(null));
    const [tttMySymbol, setTttMySymbol] = useState<'X' | 'O'>('X');
    const [tttTurn, setTttTurn] = useState<'X' | 'O'>('X');
    const [tttWinner, setTttWinner] = useState<'X' | 'O' | 'draw' | null>(null);

    // RPS state
    const [rpsMyChoice, setRpsMyChoice] = useState<'rock' | 'paper' | 'scissors' | null>(null);
    const [rpsOppChoice, setRpsOppChoice] = useState<'rock' | 'paper' | 'scissors' | null>(null);
    const [rpsResult, setRpsResult] = useState<'win' | 'lose' | 'draw' | null>(null);
    const [rpsRound, setRpsRound] = useState(1);
    const [rpsScore, setRpsScore] = useState({ me: 0, them: 0 });
    const rpsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Truth or Dare state
    const [tdPrompts, setTdPrompts] = useState<{ text: string; from: 'me' | 'them'; type: 'truth' | 'dare' }[]>([]);

    // Would You Rather state
    const [wyrQuestion, setWyrQuestion] = useState<{ a: string; b: string } | null>(null);
    const [wyrMyAnswer, setWyrMyAnswer] = useState<'A' | 'B' | null>(null);
    const [wyrTheirAnswer, setWyrTheirAnswer] = useState<'A' | 'B' | null>(null);
    const [wyrRound, setWyrRound] = useState(1);

    // Connect Four state
    const [c4Board, setC4Board] = useState<C4Cell[][]>(createEmptyBoard());
    const [c4MyColor, setC4MyColor] = useState<'R' | 'Y'>('R');
    const [c4Turn, setC4Turn] = useState<'R' | 'Y'>('R');
    const [c4Winner, setC4Winner] = useState<'R' | 'Y' | 'draw' | null>(null);

    // Snake state
    const [snakeMyRole, setSnakeMyRole] = useState<'A' | 'B'>('A');
    const [snakeOpponentDir, setSnakeOpponentDir] = useState<'up' | 'down' | 'left' | 'right' | null>(null);

    // Reset on disconnect
    useEffect(() => {
        if (onPartnerDisconnect || !isMatched) {
            setGameState({ phase: 'idle' });
            resetAll();
        }
    }, [onPartnerDisconnect, isMatched]);

    const resetTTT = () => { setTttBoard(Array(9).fill(null)); setTttMySymbol('X'); setTttTurn('X'); setTttWinner(null); };
    const resetRPS = () => { setRpsMyChoice(null); setRpsOppChoice(null); setRpsResult(null); setRpsRound(1); setRpsScore({ me: 0, them: 0 }); if (rpsTimerRef.current) clearTimeout(rpsTimerRef.current); };
    const resetTD = () => { setTdPrompts([]); };
    const resetWYR = () => { setWyrQuestion(null); setWyrMyAnswer(null); setWyrTheirAnswer(null); setWyrRound(1); };
    const resetC4 = () => { setC4Board(createEmptyBoard()); setC4MyColor('R'); setC4Turn('R'); setC4Winner(null); };
    const resetSnake = () => { setSnakeMyRole('A'); setSnakeOpponentDir(null); };
    const resetAll = () => { resetTTT(); resetRPS(); resetTD(); resetWYR(); resetC4(); resetSnake(); };

    // Handle incoming game messages
    const handleGameMessage = useCallback((msg: WebSocketMessage) => {
        const m = msg as { type: string; game: string; data?: unknown };

        switch (m.type) {
            case 'game_invite':
                if (gameState.phase === 'idle' || gameState.phase === 'menu' || gameState.phase === 'playing') {
                    resetAll();
                    setGameState({ phase: 'invite_received', game: m.game as GameType });
                }
                break;

            case 'game_accept':
                if (gameState.phase === 'invite_sent') {
                    const game = m.game as GameType;
                    if (game === 'tictactoe') { resetTTT(); setTttMySymbol('X'); setTttTurn('X'); }
                    else if (game === 'connect4') { resetC4(); setC4MyColor('R'); setC4Turn('R'); }
                    else if (game === 'wyr') { resetWYR(); const q = getRandomWYR(); setWyrQuestion(q); sendGameMessage('game_move', 'wyr', { question: q }); }
                    else if (game === 'rps') { resetRPS(); }
                    else if (game === 'truthdare') { resetTD(); }
                    else if (game === 'snake') { resetSnake(); setSnakeMyRole('A'); }
                    setGameState({ phase: 'playing', game });
                }
                break;

            case 'game_decline':
                setGameState({ phase: 'idle' });
                break;

            case 'game_move':
                if (gameState.phase === 'playing') {
                    const data = m.data as Record<string, unknown>;
                    if (m.game === 'tictactoe') {
                        const index = data.index as number;
                        const symbol = data.symbol as 'X' | 'O';
                        setTttBoard(prev => { const next = [...prev]; next[index] = symbol; const w = checkWinner(next); if (w) setTttWinner(w); return next; });
                        setTttTurn(prev => prev === 'X' ? 'O' : 'X');
                    } else if (m.game === 'rps') {
                        setRpsOppChoice(data.choice as 'rock' | 'paper' | 'scissors');
                    } else if (m.game === 'truthdare') {
                        setTdPrompts(prev => [...prev, { text: data.prompt as string, from: 'them', type: (data.prompt as string).startsWith('🔮') ? 'truth' : 'dare' }]);
                    } else if (m.game === 'wyr') {
                        if (data.question) { setWyrQuestion(data.question as { a: string; b: string }); setWyrMyAnswer(null); setWyrTheirAnswer(null); }
                        if (data.answer) { setWyrTheirAnswer(data.answer as 'A' | 'B'); }
                    } else if (m.game === 'connect4') {
                        const col = data.col as number;
                        const color = data.color as 'R' | 'Y';
                        setC4Board(prev => {
                            const next = dropPiece(prev, col, color);
                            if (next) { const w = checkConnect4Winner(next); if (w) setC4Winner(w); return next; }
                            return prev;
                        });
                        setC4Turn(prev => prev === 'R' ? 'Y' : 'R');
                    } else if (m.game === 'snake') {
                        setSnakeOpponentDir(data.dir as 'up' | 'down' | 'left' | 'right');
                    }
                }
                break;

            case 'game_leave':
                setGameState({ phase: 'idle' });
                resetAll();
                break;
        }
    }, [gameState.phase, sendGameMessage]);

    useEffect(() => { setGameHandler(handleGameMessage); return () => setGameHandler(null); }, [handleGameMessage, setGameHandler]);

    // RPS result check
    useEffect(() => {
        if (rpsMyChoice && rpsOppChoice && !rpsResult) {
            const result = getRPSResult(rpsMyChoice, rpsOppChoice);
            setRpsResult(result);
            const newScore = { ...rpsScore };
            if (result === 'win') newScore.me++;
            if (result === 'lose') newScore.them++;
            setRpsScore(newScore);
            if (newScore.me >= 2 || newScore.them >= 2) {
                // Keep the state in playing, do not schedule auto-exit timer
            } else {
                rpsTimerRef.current = setTimeout(() => { setRpsMyChoice(null); setRpsOppChoice(null); setRpsResult(null); setRpsRound(r => r + 1); }, 2000);
            }
        }
    }, [rpsMyChoice, rpsOppChoice, rpsResult, rpsScore]);

    // Actions
    const openMenu = () => setGameState({ phase: 'menu' });

    const sendInvite = (game: GameType) => {
        sendGameMessage('game_invite', game);
        setGameState({ phase: 'invite_sent', game });
    };

    const acceptInvite = () => {
        if (gameState.phase !== 'invite_received') return;
        const game = gameState.game;
        sendGameMessage('game_accept', game);
        if (game === 'tictactoe') { resetTTT(); setTttMySymbol('O'); setTttTurn('X'); }
        else if (game === 'connect4') { resetC4(); setC4MyColor('Y'); setC4Turn('R'); }
        else if (game === 'wyr') { resetWYR(); }
        else if (game === 'rps') { resetRPS(); }
        else if (game === 'truthdare') { resetTD(); }
        else if (game === 'snake') { resetSnake(); setSnakeMyRole('B'); }
        setGameState({ phase: 'playing', game });
    };

    const declineInvite = () => {
        if (gameState.phase !== 'invite_received') return;
        sendGameMessage('game_decline', gameState.game);
        setGameState({ phase: 'idle' });
    };

    const leaveGame = () => {
        if (gameState.phase === 'playing') sendGameMessage('game_leave', gameState.game);
        setGameState({ phase: 'idle' });
        resetAll();
    };

    // Game-specific handlers
    const handleTTTMove = (index: number) => {
        if (tttBoard[index] || tttWinner) return;
        const newBoard = [...tttBoard]; newBoard[index] = tttMySymbol; setTttBoard(newBoard);
        setTttTurn(tttMySymbol === 'X' ? 'O' : 'X');
        sendGameMessage('game_move', 'tictactoe', { index, symbol: tttMySymbol });
        const w = checkWinner(newBoard); if (w) setTttWinner(w);
    };

    const handleRPSChoice = (choice: 'rock' | 'paper' | 'scissors') => {
        setRpsMyChoice(choice);
        sendGameMessage('game_move', 'rps', { choice });
    };

    const handleTDPrompt = (prompt: string) => {
        setTdPrompts(prev => [...prev, { text: prompt, from: 'me', type: prompt.startsWith('🔮') ? 'truth' : 'dare' }]);
        sendGameMessage('game_move', 'truthdare', { prompt });
    };

    const handleWYRAnswer = (answer: 'A' | 'B') => {
        setWyrMyAnswer(answer);
        sendGameMessage('game_move', 'wyr', { answer });
    };

    const handleWYRNext = () => {
        const q = getRandomWYR();
        setWyrQuestion(q); setWyrMyAnswer(null); setWyrTheirAnswer(null); setWyrRound(r => r + 1);
        sendGameMessage('game_move', 'wyr', { question: q });
    };

    const handleC4Drop = (col: number) => {
        if (c4Winner) return;
        const newBoard = dropPiece(c4Board, col, c4MyColor);
        if (!newBoard) return;
        setC4Board(newBoard);
        setC4Turn(c4MyColor === 'R' ? 'Y' : 'R');
        sendGameMessage('game_move', 'connect4', { col, color: c4MyColor });
        const w = checkConnect4Winner(newBoard); if (w) setC4Winner(w);
    };

    if (!isMatched) return null;

    // Idle — just a button
    if (gameState.phase === 'idle') {
        return (
            <button onClick={openMenu} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-md text-text-secondary/50 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-all shrink-0" title="Play a game">
                <Gamepad2 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
        );
    }

    // Game menu
    if (gameState.phase === 'menu') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setGameState({ phase: 'idle' })}>
                <div className="bg-dark-card border border-white/10 rounded-xl p-4 md:p-5 max-w-[min(20rem,90vw)] shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                    <p className="font-heading font-semibold text-text-primary text-base mb-4 flex items-center gap-2">
                        <Gamepad2 className="w-5 h-5 text-neon-cyan" /> Play a Game
                    </p>
                    <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
                        {([
                            { id: 'tictactoe', icon: '❌⭕', name: 'Tic-Tac-Toe', desc: 'Classic 3x3 grid' },
                            { id: 'rps', icon: '🪨📄✂️', name: 'Rock Paper Scissors', desc: 'Best of 3' },
                            { id: 'connect4', icon: '🔴🟡', name: 'Connect Four', desc: 'Get 4 in a row' },
                            { id: 'snake', icon: '🐍', name: 'Grid Snake', desc: 'Lightcycles duel' },
                            { id: 'truthdare', icon: '🔮🔥', name: 'Truth or Dare', desc: 'Ask anything' },
                            { id: 'wyr', icon: '🤔', name: 'Would You Rather', desc: 'Pick your side' },
                        ] as { id: GameType; icon: string; name: string; desc: string }[]).map(g => (
                            <button
                                key={g.id}
                                onClick={() => sendInvite(g.id)}
                                className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 hover:bg-neon-cyan/10 hover:border-neon-cyan/30 transition-all text-left"
                            >
                                <div className="font-mono text-sm text-text-primary">{g.icon} {g.name}</div>
                                <div className="font-mono text-[10px] text-text-secondary/50 mt-0.5">{g.desc}</div>
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setGameState({ phase: 'idle' })} className="mt-3 w-full font-mono text-xs text-text-secondary/60 hover:text-text-secondary transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    // Invite sent
    if (gameState.phase === 'invite_sent') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
                <div className="bg-dark-card border border-white/10 rounded-xl p-4 md:p-5 max-w-[min(18rem,90vw)] shadow-2xl animate-fade-in-up text-center">
                    <div className="flex justify-center gap-1 mb-3">
                        <div className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="font-mono text-sm text-text-primary mb-1">Invited stranger to play</p>
                    <p className="font-mono text-xs text-neon-cyan mb-4">{GAME_NAMES[gameState.game]}</p>
                    <button onClick={() => { sendGameMessage('game_decline', gameState.game); setGameState({ phase: 'idle' }); }} className="font-mono text-xs text-red-400 hover:text-red-300 transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    // Invite received
    if (gameState.phase === 'invite_received') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
                <div className="bg-dark-card border border-white/10 rounded-xl p-4 md:p-5 max-w-[min(18rem,90vw)] shadow-2xl animate-fade-in-up text-center">
                    <Gamepad2 className="w-8 h-8 text-neon-cyan mx-auto mb-3" />
                    <p className="font-mono text-sm text-text-primary mb-1">Stranger wants to play</p>
                    <p className="font-mono text-xs text-neon-cyan mb-4">{GAME_NAMES[gameState.game]}</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={declineInvite} className="px-5 py-2 rounded-lg border border-white/15 bg-white/5 font-mono text-sm text-text-secondary hover:bg-white/10 transition-all">Decline</button>
                        <button onClick={acceptInvite} className="px-5 py-2 rounded-lg bg-neon-cyan text-black font-mono text-sm font-bold hover:bg-neon-cyan/90 transition-all">Play!</button>
                    </div>
                </div>
            </div>
        );
    }

    // Playing
    if (gameState.phase === 'playing') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="bg-dark-card border border-white/10 rounded-xl p-4 md:p-5 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
                    {gameState.game === 'tictactoe' && (
                        <div className="flex flex-col items-center">
                            <TicTacToe isMyTurn={tttTurn === tttMySymbol} mySymbol={tttMySymbol} onMove={handleTTTMove} onLeave={leaveGame} board={tttBoard} winner={tttWinner} gameOver={!!tttWinner} />
                            {tttWinner && (
                                <div className="flex gap-3 mt-4 w-full justify-center">
                                    <button onClick={leaveGame} className="px-5 py-2 rounded-lg border border-white/15 bg-white/5 font-mono text-sm text-text-secondary hover:bg-white/10 transition-all">Leave</button>
                                    <button onClick={() => sendInvite('tictactoe')} className="px-5 py-2 rounded-lg bg-neon-cyan text-black font-mono text-sm font-bold hover:bg-neon-cyan/90 transition-all shadow-neon-small">Play Again</button>
                                </div>
                            )}
                        </div>
                    )}
                    {gameState.game === 'rps' && (
                        <div className="flex flex-col items-center">
                            <RockPaperScissors myChoice={rpsMyChoice} opponentChoice={rpsResult ? rpsOppChoice : null} onChoice={handleRPSChoice} onLeave={leaveGame} result={rpsResult} round={rpsRound} score={rpsScore} />
                            {(rpsScore.me >= 2 || rpsScore.them >= 2) && (
                                <div className="flex flex-col items-center gap-3 mt-4 w-full">
                                    <div className={`font-mono text-sm font-bold ${rpsScore.me >= 2 ? 'text-neon-green' : 'text-red-400'}`}>
                                        {rpsScore.me >= 2 ? '🏆 You won the Match!' : '❌ You lost the Match!'}
                                    </div>
                                    <div className="flex gap-3 justify-center w-full">
                                        <button onClick={leaveGame} className="px-5 py-2 rounded-lg border border-white/15 bg-white/5 font-mono text-sm text-text-secondary hover:bg-white/10 transition-all">Leave</button>
                                        <button onClick={() => sendInvite('rps')} className="px-5 py-2 rounded-lg bg-neon-cyan text-black font-mono text-sm font-bold hover:bg-neon-cyan/90 transition-all shadow-neon-small">Play Again</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {gameState.game === 'truthdare' && (
                        <TruthDare onSendPrompt={handleTDPrompt} onLeave={leaveGame} prompts={tdPrompts} />
                    )}
                    {gameState.game === 'wyr' && (
                        <WouldYouRather onAnswer={handleWYRAnswer} onNext={handleWYRNext} onLeave={leaveGame} question={wyrQuestion} myAnswer={wyrMyAnswer} theirAnswer={wyrTheirAnswer} round={wyrRound} />
                    )}
                    {gameState.game === 'connect4' && (
                        <div className="flex flex-col items-center">
                            <ConnectFour board={c4Board} myColor={c4MyColor} isMyTurn={c4Turn === c4MyColor} onDrop={handleC4Drop} onLeave={leaveGame} winner={c4Winner} gameOver={!!c4Winner} />
                            {c4Winner && (
                                <div className="flex gap-3 mt-4 w-full justify-center">
                                    <button onClick={leaveGame} className="px-5 py-2 rounded-lg border border-white/15 bg-white/5 font-mono text-sm text-text-secondary hover:bg-white/10 transition-all">Leave</button>
                                    <button onClick={() => sendInvite('connect4')} className="px-5 py-2 rounded-lg bg-neon-cyan text-black font-mono text-sm font-bold hover:bg-neon-cyan/90 transition-all shadow-neon-small">Play Again</button>
                                </div>
                            )}
                        </div>
                    )}
                    {gameState.game === 'snake' && (
                        <GridSnake
                            myRole={snakeMyRole}
                            opponentDir={snakeOpponentDir}
                            onSendMove={(dir) => sendGameMessage('game_move', 'snake', { dir })}
                            onLeave={leaveGame}
                            isBot={!!partnerId?.startsWith('bot-')}
                            onPlayAgain={() => sendInvite('snake')}
                        />
                    )}
                </div>
            </div>
        );
    }

    return null;
}
