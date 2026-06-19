import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';

export function useGameSocket() {
  const { socket } = useSocket();
  const { dispatch } = useGame();

  useEffect(() => {
    if (!socket) return;

    const withHost = (data) => ({
      ...data,
      isHost: data.hostSocketId === socket.id,
    });

    socket.on('room_created', (data) =>
      dispatch({ type: 'ROOM_CREATED', payload: withHost(data) })
    );
    socket.on('room_joined', (data) =>
      dispatch({ type: 'ROOM_JOINED', payload: withHost(data) })
    );
    socket.on('player_joined', (data) =>
      dispatch({ type: 'PLAYERS_UPDATED', payload: withHost(data) })
    );
    socket.on('player_left', (data) =>
      dispatch({ type: 'PLAYERS_UPDATED', payload: withHost(data) })
    );
    socket.on('player_ready', (data) =>
      dispatch({ type: 'PLAYERS_UPDATED', payload: withHost(data) })
    );
    socket.on('host_changed', (data) =>
      dispatch({ type: 'HOST_CHANGED', payload: withHost(data) })
    );

    socket.on('game_started', (data) => dispatch({ type: 'GAME_STARTED', payload: data }));
    socket.on('round_start', (data) => dispatch({ type: 'ROUND_START', payload: data }));
    socket.on('word_chosen', (data) => dispatch({ type: 'WORD_CHOSEN', payload: data }));
    socket.on('timer_update', (data) => dispatch({ type: 'TIMER_UPDATE', payload: data }));
    socket.on('hint_reveal', (data) => dispatch({ type: 'HINT_REVEAL', payload: data }));
    socket.on('game_state', (data) => dispatch({ type: 'GAME_STATE', payload: data }));

    socket.on('guess_result', (data) => {
      dispatch({
        type: 'SCORES_UPDATED',
        payload: { scores: data.scores, players: data.players },
      });

      if (data.correct) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            type: 'system',
            text: `${data.playerName} guessed the word. +${data.points} pts`,
          },
        });
      }
    });

    socket.on('chat_message', (data) =>
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { type: 'chat', ...data },
      })
    );

    socket.on('close_guess', ({ message }) =>
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { type: 'system', text: message },
      })
    );

    socket.on('round_end', (data) => dispatch({ type: 'ROUND_END', payload: data }));
    socket.on('game_over', (data) => dispatch({ type: 'GAME_OVER', payload: data }));

    socket.on('game_aborted', ({ reason }) => {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { type: 'system', text: `Game ended: ${reason}` },
      });
      dispatch({ type: 'RESET' });
    });

    socket.on('join_error', ({ message }) =>
      dispatch({ type: 'SET_NOTICE', payload: { tone: 'error', text: message } })
    );
    socket.on('start_error', ({ message }) =>
      dispatch({ type: 'SET_NOTICE', payload: { tone: 'error', text: message } })
    );

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('player_ready');
      socket.off('host_changed');
      socket.off('game_started');
      socket.off('round_start');
      socket.off('word_chosen');
      socket.off('timer_update');
      socket.off('hint_reveal');
      socket.off('game_state');
      socket.off('guess_result');
      socket.off('chat_message');
      socket.off('close_guess');
      socket.off('round_end');
      socket.off('game_over');
      socket.off('game_aborted');
      socket.off('join_error');
      socket.off('start_error');
    };
  }, [socket, dispatch]);
}
