import { useEffect, useRef, useState, useCallback } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';
type Position = { x: number; y: number };

interface GridSnakeProps {
    myRole: 'A' | 'B';
    opponentDir: Direction | null;
    onSendMove: (dir: Direction) => void;
    onLeave: () => void;
    isBot: boolean;
    onPlayAgain?: () => void;
}

const GRID_SIZE = 24;
const TICK_RATE = 260; // ms per tick (slower, more playable pace)

export function GridSnake({ myRole, opponentDir, onSendMove, onLeave, isBot, onPlayAgain }: GridSnakeProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState<'A' | 'B' | 'draw' | null>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    // Keep positions and trails in refs to access in the game loop without re-triggering effects
    const stateRef = useRef({
        posA: { x: 4, y: 12 } as Position,
        posB: { x: 19, y: 12 } as Position,
        dirA: 'right' as Direction,
        dirB: 'left' as Direction,
        trailA: [{ x: 4, y: 12 }] as Position[],
        trailB: [{ x: 19, y: 12 }] as Position[],
    });

    const isMyRoleA = myRole === 'A';
    const myDir = isMyRoleA ? stateRef.current.dirA : stateRef.current.dirB;

    // Send direction change
    const changeDirection = useCallback((newDir: Direction) => {
        if (gameOver) return;

        const currentDir = isMyRoleA ? stateRef.current.dirA : stateRef.current.dirB;

        // Prevent 180-degree turns into oneself
        if (
            (newDir === 'left' && currentDir === 'right') ||
            (newDir === 'right' && currentDir === 'left') ||
            (newDir === 'up' && currentDir === 'down') ||
            (newDir === 'down' && currentDir === 'up')
        ) return;

        if (isMyRoleA) {
            stateRef.current.dirA = newDir;
        } else {
            stateRef.current.dirB = newDir;
        }
        onSendMove(newDir);
    }, [isMyRoleA, onSendMove, gameOver]);

    // Handle keyboard steering
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameOver) return;
            let dir: Direction | null = null;
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dir = 'up';
            else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dir = 'down';
            else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dir = 'left';
            else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dir = 'right';

            if (dir) {
                e.preventDefault();
                changeDirection(dir);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [changeDirection, gameOver]);

    // Handle Touch Swipe steering on canvas
    const handleTouchStart = (e: React.TouchEvent) => {
        if (gameOver) return;
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (gameOver || !touchStartRef.current) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        // Minimum swipe distance threshold (30 pixels)
        if (Math.max(absX, absY) > 30) {
            if (absX > absY) {
                // Horizontal swipe
                changeDirection(dx > 0 ? 'right' : 'left');
            } else {
                // Vertical swipe
                changeDirection(dy > 0 ? 'down' : 'up');
            }
        }
        touchStartRef.current = null;
    };

    // Read opponent moves
    useEffect(() => {
        if (opponentDir) {
            if (isMyRoleA) {
                stateRef.current.dirB = opponentDir;
            } else {
                stateRef.current.dirA = opponentDir;
            }
        }
    }, [opponentDir, isMyRoleA]);

    // Simple bot steering logic
    const steerBot = useCallback(() => {
        const state = stateRef.current;
        const botPos = isMyRoleA ? state.posB : state.posA;
        const botDir = isMyRoleA ? state.dirB : state.dirA;

        // Check if next move is safe
        const getNextPos = (pos: Position, dir: Direction): Position => {
            if (dir === 'up') return { x: pos.x, y: pos.y - 1 };
            if (dir === 'down') return { x: pos.x, y: pos.y + 1 };
            if (dir === 'left') return { x: pos.x - 1, y: pos.y };
            return { x: pos.x + 1, y: pos.y };
        };

        const isSafe = (pos: Position): boolean => {
            // Wall check
            if (pos.x < 0 || pos.x >= GRID_SIZE || pos.y < 0 || pos.y >= GRID_SIZE) return false;
            // Trail checks
            const hitA = state.trailA.some(p => p.x === pos.x && p.y === pos.y);
            const hitB = state.trailB.some(p => p.x === pos.x && p.y === pos.y);
            return !hitA && !hitB;
        };

        const next = getNextPos(botPos, botDir);
        // If current direction is safe, 92% chance to keep it
        if (isSafe(next) && Math.random() < 0.92) {
            return;
        }

        // Try other directions
        const dirs: Direction[] = ['up', 'down', 'left', 'right'];
        const validDirs = dirs.filter(d => {
            if (botDir === 'left' && d === 'right') return false;
            if (botDir === 'right' && d === 'left') return false;
            if (botDir === 'up' && d === 'down') return false;
            if (botDir === 'down' && d === 'up') return false;
            return true;
        });

        // Rank safe directions
        const safeDirs = validDirs.filter(d => isSafe(getNextPos(botPos, d)));

        if (safeDirs.length > 0) {
            const chosen = safeDirs[Math.floor(Math.random() * safeDirs.length)];
            if (isMyRoleA) {
                stateRef.current.dirB = chosen;
            } else {
                stateRef.current.dirA = chosen;
            }
        }
    }, [isMyRoleA]);

    // Game loop
    useEffect(() => {
        if (gameOver) return;

        const interval = setInterval(() => {
            if (isBot) {
                steerBot();
            }

            const state = stateRef.current;

            // Move Player A
            let nextA = { ...state.posA };
            if (state.dirA === 'up') nextA.y -= 1;
            else if (state.dirA === 'down') nextA.y += 1;
            else if (state.dirA === 'left') nextA.x -= 1;
            else if (state.dirA === 'right') nextA.x += 1;

            // Move Player B
            let nextB = { ...state.posB };
            if (state.dirB === 'up') nextB.y -= 1;
            else if (state.dirB === 'down') nextB.y += 1;
            else if (state.dirB === 'left') nextB.x -= 1;
            else if (state.dirB === 'right') nextB.x += 1;

            // Collision checks
            const wallA = nextA.x < 0 || nextA.x >= GRID_SIZE || nextA.y < 0 || nextA.y >= GRID_SIZE;
            const wallB = nextB.x < 0 || nextB.x >= GRID_SIZE || nextB.y < 0 || nextB.y >= GRID_SIZE;

            const trailSelfA = state.trailA.some(p => p.x === nextA.x && p.y === nextA.y);
            const trailOppA = state.trailB.some(p => p.x === nextA.x && p.y === nextA.y);

            const trailSelfB = state.trailB.some(p => p.x === nextB.x && p.y === nextB.y);
            const trailOppB = state.trailA.some(p => p.x === nextB.x && p.y === nextB.y);

            const crashA = wallA || trailSelfA || trailOppA;
            const crashB = wallB || trailSelfB || trailOppB;
            const headOn = nextA.x === nextB.x && nextA.y === nextB.y;

            if (headOn || (crashA && crashB)) {
                setWinner('draw');
                setGameOver(true);
                clearInterval(interval);
                return;
            } else if (crashA) {
                setWinner('B');
                setGameOver(true);
                clearInterval(interval);
                return;
            } else if (crashB) {
                setWinner('A');
                setGameOver(true);
                clearInterval(interval);
                return;
            }

            // Update state
            state.posA = nextA;
            state.posB = nextB;
            state.trailA.push(nextA);
            state.trailB.push(nextB);
        }, TICK_RATE);

        return () => clearInterval(interval);
    }, [gameOver, isBot, steerBot]);

    // Canvas drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            const width = canvas.width;
            const height = canvas.height;
            const cellSize = width / GRID_SIZE;

            ctx.clearRect(0, 0, width, height);

            // Draw grid background
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= GRID_SIZE; i++) {
                ctx.beginPath();
                ctx.moveTo(i * cellSize, 0);
                ctx.lineTo(i * cellSize, height);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, i * cellSize);
                ctx.lineTo(width, i * cellSize);
                ctx.stroke();
            }

            const state = stateRef.current;

            // Helper to draw trails
            const drawTrail = (trail: Position[], color: string, glowColor: string) => {
                if (trail.length === 0) return;
                ctx.beginPath();
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = 3;
                ctx.strokeStyle = color;

                // Set glow effect
                ctx.shadowBlur = 10;
                ctx.shadowColor = glowColor;

                ctx.moveTo(trail[0].x * cellSize + cellSize / 2, trail[0].y * cellSize + cellSize / 2);
                for (let i = 1; i < trail.length; i++) {
                    ctx.lineTo(trail[i].x * cellSize + cellSize / 2, trail[i].y * cellSize + cellSize / 2);
                }
                ctx.stroke();

                // Draw head glow dot
                const head = trail[trail.length - 1];
                ctx.beginPath();
                ctx.arc(head.x * cellSize + cellSize / 2, head.y * cellSize + cellSize / 2, 4, 0, 2 * Math.PI);
                ctx.fillStyle = '#FFFFFF';
                ctx.shadowBlur = 15;
                ctx.shadowColor = glowColor;
                ctx.fill();

                ctx.shadowBlur = 0;
            };

            // Draw trails (A is Cyan, B is Pink)
            drawTrail(state.trailA, '#00F0FF', 'rgba(0, 240, 255, 0.8)');
            drawTrail(state.trailB, '#FF007F', 'rgba(255, 0, 127, 0.8)');

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [gameOver]);

    return (
        <div className="flex flex-col items-center gap-4 select-none w-full max-w-[min(300px,80vw)]">
            {/* Header */}
            <div className="flex items-center justify-between w-full">
                <span className="font-heading font-bold text-base md:text-lg text-text-primary">Grid Snake</span>
                <button
                    onClick={onLeave}
                    className="font-mono text-[10px] md:text-xs text-red-400 hover:text-red-300 transition-colors px-2.5 py-1 rounded border border-red-400/30 hover:border-red-400/60"
                >
                    Leave
                </button>
            </div>

            <div className="font-mono text-[10px] md:text-xs text-text-secondary">
                You: <span className={`font-bold ${isMyRoleA ? 'text-neon-cyan' : 'text-pink-500'}`}>
                    {isMyRoleA ? '🔵 Player A (Cyan)' : '🔴 Player B (Pink)'}
                </span>
            </div>

            {/* Game Canvas Container - fully responsive */}
            <div className="relative border border-white/10 rounded-lg overflow-hidden bg-black/60 shadow-[0_0_15px_rgba(0,0,0,0.5)] w-full aspect-square max-w-[min(280px,76vw)]">
                <canvas
                    ref={canvasRef}
                    width={280}
                    height={280}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="block w-full h-full cursor-pointer"
                    title="Swipe on canvas to steer"
                />

                {/* Game Over Screen */}
                {gameOver && (
                    <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-3 animate-fade-in p-4 text-center">
                        <span className="font-heading font-bold text-lg md:text-xl text-text-primary tracking-wider">GAME OVER</span>
                        <span className={`font-mono text-xs md:text-sm font-semibold ${
                            winner === 'draw' ? 'text-yellow-400' :
                            winner === myRole ? 'text-neon-green' : 'text-red-400'
                        }`}>
                            {winner === 'draw' ? "It's a Draw!" :
                             winner === myRole ? "🎉 You Won!" : "You Lost!"}
                        </span>
                        <div className="flex gap-2.5 mt-2">
                            <button
                                onClick={onLeave}
                                className="font-mono text-[11px] bg-white/10 hover:bg-white/20 text-text-primary px-3 py-1.5 rounded transition-all"
                            >
                                Leave
                            </button>
                            {onPlayAgain && (
                                <button
                                    onClick={onPlayAgain}
                                    className="font-mono text-[11px] bg-neon-cyan text-black px-4.5 py-1.5 rounded font-bold transition-all btn-neon shadow-neon-small"
                                >
                                    Play Again
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Ergonomic Diamond D-pad */}
            <div className="grid grid-cols-3 gap-1.5 w-36 h-28 my-1 md:hidden select-none">
                <div />
                <button
                    onClick={() => changeDirection('up')}
                    disabled={myDir === 'down' || gameOver}
                    className="bg-white/5 border border-white/10 rounded flex items-center justify-center text-sm text-text-secondary active:bg-neon-cyan/20 active:text-neon-cyan disabled:opacity-30 select-none"
                >
                    ▲
                </button>
                <div />

                <button
                    onClick={() => changeDirection('left')}
                    disabled={myDir === 'right' || gameOver}
                    className="bg-white/5 border border-white/10 rounded flex items-center justify-center text-sm text-text-secondary active:bg-neon-cyan/20 active:text-neon-cyan disabled:opacity-30 select-none"
                >
                    ◀
                </button>
                <div className="flex items-center justify-center text-[9px] text-text-secondary/20 font-mono">
                    PAD
                </div>
                <button
                    onClick={() => changeDirection('right')}
                    disabled={myDir === 'left' || gameOver}
                    className="bg-white/5 border border-white/10 rounded flex items-center justify-center text-sm text-text-secondary active:bg-neon-cyan/20 active:text-neon-cyan disabled:opacity-30 select-none"
                >
                    ▶
                </button>

                <div />
                <button
                    onClick={() => changeDirection('down')}
                    disabled={myDir === 'up' || gameOver}
                    className="bg-white/5 border border-white/10 rounded flex items-center justify-center text-sm text-text-secondary active:bg-neon-cyan/20 active:text-neon-cyan disabled:opacity-30 select-none"
                >
                    ▼
                </button>
                <div />
            </div>

            {/* Help text */}
            <div className="font-mono text-[9px] text-text-secondary/40 text-center leading-normal">
                <span className="hidden md:inline">Use Arrow keys or WASD to steer</span>
                <span className="md:hidden">Swipe board or use D-pad to steer</span>
            </div>
        </div>
    );
}
