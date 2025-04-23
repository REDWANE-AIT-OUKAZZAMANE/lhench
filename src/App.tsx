import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Constants ---
const GRID_SIZE = 20; // The grid will be 20x20 cells
const CONTAINER_WIDTH_CLASS = 'w-80'; // Approx GRID_SIZE * 1rem (w-4) = 20rem
const CONTAINER_HEIGHT_CLASS = 'h-80'; // Approx GRID_SIZE * 1rem (h-4) = 20rem
const INITIAL_SPEED = 200; // Milliseconds between game ticks
const SPEED_INCREMENT = 5; // Speed increase per bug eaten (ms reduction)
const MIN_SPEED = 60; // Fastest speed allowed

// --- Types ---
type Coordinate = {
  x: number;
  y: number;
};

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// --- Helper Functions ---
const getRandomCoords = (snakeBody: Coordinate[] = []): Coordinate => {
  let newBugPos: Coordinate;
  let isOverlap = false;
  do {
    newBugPos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    // Check if the new position overlaps with any part of the snake
    isOverlap = snakeBody.some(segment => segment.x === newBugPos.x && segment.y === newBugPos.y);
  } while (isOverlap); // Keep trying until a non-overlapping position is found
  return newBugPos;
};

// --- React Component ---
const App: React.FC = () => {
  // --- State ---
  const getInitialSnake = useCallback((): Coordinate[] => [{
    x: Math.floor(GRID_SIZE / 2),
    y: Math.floor(GRID_SIZE / 2)
  }], []);

  const [snake, setSnake] = useState<Coordinate[]>(getInitialSnake);
  const [bug, setBug] = useState<Coordinate>(getRandomCoords(getInitialSnake()));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [nextDirection, setNextDirection] = useState<Direction>('RIGHT'); // Input buffer
  const [score, setScore] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(INITIAL_SPEED);

  // --- Refs ---
  const gameLoopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null); // Ref for focusing the game area

  // --- Game Logic Functions ---
  // Reset the game to its initial state
  const resetGame = useCallback(() => {
    const initialSnake = getInitialSnake();
    setSnake(initialSnake);
    setBug(getRandomCoords(initialSnake));
    setDirection('RIGHT');
    setNextDirection('RIGHT');
    setScore(0);
    setIsGameOver(false);
    setSpeed(INITIAL_SPEED);
    // Ensure the game container has focus to capture keyboard events
    gameContainerRef.current?.focus();
  }, [getInitialSnake]);

  // Main game loop logic
  const runGameLoop = useCallback(() => {
    if (isGameOver) return;

    // Update direction from the buffered input
    setDirection(nextDirection);

    setSnake(prevSnake => {
      const currentHead = prevSnake[0];
      let newHead: Coordinate;

      // Calculate new head position based on the direction
      switch (nextDirection) {
        case 'UP':
          newHead = { x: currentHead.x, y: currentHead.y - 1 };
          break;
        case 'DOWN':
          newHead = { x: currentHead.x, y: currentHead.y + 1 };
          break;
        case 'LEFT':
          newHead = { x: currentHead.x - 1, y: currentHead.y };
          break;
        case 'RIGHT':
          newHead = { x: currentHead.x + 1, y: currentHead.y };
          break;
        default:
          newHead = currentHead;
      }

      // Border collision detection
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        setIsGameOver(true);
        return prevSnake; // Stop update, game over
      }

      // Self collision detection
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        return prevSnake; // Stop update, game over
      }

      // Bug eating logic
      let ateBug = false;
      if (newHead.x === bug.x && newHead.y === bug.y) {
        ateBug = true;
        setScore(prevScore => prevScore + 1);
        // Increase speed, but not below MIN_SPEED
        setSpeed(prevSpeed => Math.max(MIN_SPEED, prevSpeed - SPEED_INCREMENT));
      }

      // Update snake
      const newSnake = [newHead, ...prevSnake]; // Add new head
      if (!ateBug) {
        newSnake.pop(); // Remove tail if no bug was eaten
      }

      // Generate new bug if eaten
      if (ateBug) {
        setBug(getRandomCoords(newSnake));
      }

      return newSnake;
    });
  }, [bug, nextDirection, isGameOver]);

  // --- Effects ---
  // Game loop timer effect
  useEffect(() => {
    if (isGameOver) {
      if (gameLoopTimeoutRef.current) {
        clearTimeout(gameLoopTimeoutRef.current);
      }
      return;
    }

    // Clear existing timeout
    if (gameLoopTimeoutRef.current) {
      clearTimeout(gameLoopTimeoutRef.current);
    }

    // Set new timeout
    gameLoopTimeoutRef.current = setTimeout(runGameLoop, speed);

    // Cleanup on unmount
    return () => {
      if (gameLoopTimeoutRef.current) {
        clearTimeout(gameLoopTimeoutRef.current);
      }
    };
  }, [runGameLoop, speed, isGameOver, snake]);

  // Keyboard input effect
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isGameOver) return;

    let newDirection: Direction | null = null;
    switch (e.key) {
      case 'ArrowUp':
        if (direction !== 'DOWN') newDirection = 'UP';
        break;
      case 'ArrowDown':
        if (direction !== 'UP') newDirection = 'DOWN';
        break;
      case 'ArrowLeft':
        if (direction !== 'RIGHT') newDirection = 'LEFT';
        break;
      case 'ArrowRight':
        if (direction !== 'LEFT') newDirection = 'RIGHT';
        break;
      default:
        break;
    }

    if (newDirection) {
      setNextDirection(newDirection);
    }
  }, [direction, isGameOver]);

  // Keyboard event listener effect
  useEffect(() => {
    // Focus the container on mount
    gameContainerRef.current?.focus();

    // Event handler
    const onKeyDown = (e: KeyboardEvent) => {
      handleKeyDown(e);
    };
    
    // Add event listener
    window.addEventListener('keydown', onKeyDown);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [handleKeyDown]);

  // --- Rendering ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 font-sans">
      <h1 className="text-3xl font-bold mb-4 text-green-400">Snake Game</h1>
      
      <div className="flex items-center justify-between w-full max-w-md mb-4 px-2">
        <div className="text-xl font-medium">Score: <span className="text-yellow-400 font-bold">{score}</span></div>
        <div className="text-sm text-gray-400">Speed: {Math.round(1000 / speed)} blocks/sec</div>
      </div>

      {/* Game Container */}
      <div
        ref={gameContainerRef}
        tabIndex={0}
        className={`relative ${CONTAINER_WIDTH_CLASS} ${CONTAINER_HEIGHT_CLASS} bg-gray-800 border-4 border-green-700 rounded-lg overflow-hidden shadow-2xl focus:outline-none focus:ring-4 focus:ring-green-500/50`}
        style={{ perspective: '800px' }}
      >
        {/* Snake Segments */}
        {snake.map((segment, index) => (
          <div
            key={index}
            className={`absolute rounded ${index === 0 ? 'bg-green-400 z-10' : 'bg-green-600'} shadow-md border border-green-700/50`}
            style={{
              left: `${segment.x * (100 / GRID_SIZE)}%`,
              top: `${segment.y * (100 / GRID_SIZE)}%`,
              width: `${100 / GRID_SIZE}%`,
              height: `${100 / GRID_SIZE}%`,
              transform: `translateZ(${index === 0 ? '5px' : '0px'}) scale(${index === 0 ? 1.1 : 1.0})`,
              transition: 'left 0.1s linear, top 0.1s linear, transform 0.1s ease-out',
            }}
          />
        ))}

        {/* Bug */}
        <div
          className="absolute bg-red-500 rounded-full shadow-xl animate-pulse border border-red-700/50"
          style={{
            left: `${bug.x * (100 / GRID_SIZE)}%`,
            top: `${bug.y * (100 / GRID_SIZE)}%`,
            width: `${100 / GRID_SIZE}%`,
            height: `${100 / GRID_SIZE}%`,
            transform: 'translateZ(3px) scale(0.9)',
          }}
        />

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center z-20 rounded-md">
            <h2 className="text-5xl font-extrabold text-red-500 mb-4 drop-shadow-lg">Game Over!</h2>
            <p className="text-2xl mb-8 text-gray-200">Your Final Score: <span className="text-yellow-400 font-bold">{score}</span></p>
            <button
              onClick={resetGame}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-400/50"
            >
              Restart Game
            </button>
          </div>
        )}
      </div>
      
      <p className="mt-6 text-sm text-gray-400">Use <kbd className="px-1 py-0.5 border border-gray-500 rounded bg-gray-700 text-gray-300">Arrow Keys</kbd> to control the snake.</p>
    </div>
  );
};

export default App;
