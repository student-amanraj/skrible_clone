import { createContext, useContext, useReducer } from 'react';

const GameContext = createContext(null);

const initialState = {
  roomId: null,
  playerName: '',
  players: [],
  isHost: false,
  hostSocketId: null,
  settings: {},
  gamePhase: 'home', // home | lobby | word_selection | drawing | round_end | game_over
  round: 0,
  totalRounds: 0,
  drawerId: null,
  wordOptions: [],
  wordMask: '',
  currentWord: null, // only for the drawer
  timeLeft: 0,
  scores: [],
  messages: [],
  winner: null,
  leaderboard: [],
  notice: null,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'ROOM_CREATED':
    case 'ROOM_JOINED':
      return {
        ...state,
        roomId: action.payload.roomId,
        players: action.payload.players,
        isHost: action.payload.isHost,
        hostSocketId: action.payload.hostSocketId,
        settings: action.payload.settings,
        scores: action.payload.players.map((p) => ({
          socketId: p.socketId,
          name: p.name,
          score: p.score || 0,
        })),
        messages: [],
        notice: null,
        gamePhase: 'lobby',
      };

    case 'SET_PLAYER_NAME':
      return { ...state, playerName: action.payload };

    case 'PLAYERS_UPDATED':
      return {
        ...state,
        players: action.payload.players || action.payload,
        hostSocketId: action.payload.hostSocketId ?? state.hostSocketId,
        isHost: action.payload.isHost ?? state.isHost,
      };

    case 'GAME_STARTED':
      return {
        ...state,
        gamePhase: 'drawing',
        players: action.payload.players,
        hostSocketId: action.payload.hostSocketId ?? state.hostSocketId,
        totalRounds: action.payload.settings?.rounds ?? state.settings?.rounds ?? 0,
      };

    case 'ROUND_START':
      return {
        ...state,
        round: action.payload.round,
        totalRounds: action.payload.totalRounds,
        drawerId: action.payload.drawerId,
        currentWord: null,
        wordOptions: action.payload.wordOptions || [],
        wordMask: '',
        gamePhase: action.payload.isDrawer ? 'word_selection' : 'drawing',
      };

    case 'WORD_CHOSEN':
      return {
        ...state,
        currentWord: action.payload.word,
        wordOptions: [],
        wordMask: action.payload.wordMask,
        gamePhase: 'drawing',
      };

    case 'TIMER_UPDATE':
      return { ...state, timeLeft: action.payload.timeLeft };

    case 'HINT_REVEAL':
      return { ...state, wordMask: action.payload.wordMask };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages.slice(-99), action.payload] };

    case 'SCORES_UPDATED':
      return {
        ...state,
        scores: action.payload.scores || action.payload,
        players: action.payload.players || state.players,
      };

    case 'ROUND_END':
      return {
        ...state,
        scores: action.payload.scores,
        players: action.payload.players || state.players,
        gamePhase: 'round_end',
        currentWord: action.payload.word,
        wordOptions: [],
      };

    case 'GAME_OVER':
      return {
        ...state,
        gamePhase: 'game_over',
        winner: action.payload.winner,
        leaderboard: action.payload.leaderboard || [],
        scores: action.payload.leaderboard || state.scores,
      };

    case 'HOST_CHANGED':
      return {
        ...state,
        hostSocketId: action.payload.hostSocketId,
        isHost: action.payload.isHost,
        players: action.payload.players || state.players,
      };

    case 'GAME_STATE':
      return {
        ...state,
        round: action.payload.round,
        totalRounds: action.payload.totalRounds,
        drawerId: action.payload.drawerId,
        wordMask: action.payload.wordMask,
        scores: action.payload.scores,
        players: action.payload.players || state.players,
        hostSocketId: action.payload.hostSocketId ?? state.hostSocketId,
      };

    case 'SET_NOTICE':
      return { ...state, notice: action.payload };

    case 'CLEAR_NOTICE':
      return { ...state, notice: null };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
