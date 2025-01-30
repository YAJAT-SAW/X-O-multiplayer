import './App.css'
import React, { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

const socket = io()

export default function App() {
  const [roomId, setRoomId] = useState('');
  const [turnM, setTurnM] = useState('');
  const [create, setCreate] = useState('');
  const [clientLog, setClientLog] = useState('');
  const [Boxes, setBoxes] = useState(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState('X');
  const [method, setMethod] = useState(null);
  const [connection, setConnection] = useState(false);

  // Square component
  const SquareComponent = ({ value, num }) => (
    <div className="square" onClick={() => handleClick(num)}>
      {value}
    </div>
  );

  // Connect to the room
  const handleConnect = () => {
    if (roomId.trim() !== '') {
      socket.emit('join', roomId);
    }
  };

  // Create a room
  const handleCreate = () => {
    if (create.trim() !== '') {
      socket.emit('create-room', create);
      setRoomId(create);
    }
  };

  // Check if there's a winner
  const checkWinner = () => {
    const winningCombinations = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]
    ];

    for (let combo of winningCombinations) {
      const [a, b, c] = combo;
      if (Boxes[a] && Boxes[a] === Boxes[b] && Boxes[a] === Boxes[c]) {
        return true;
      }
    }
    return false;
  };

  const winner = checkWinner() ? (currentTurn === 'X' ? 'O' : 'X') : null;

  // Handle click for online game or offline game
  const handleClick = (e) => {
    if (method === "online" && !winner) {
      socket.emit('turn', { turn: e, roomId: roomId, turnQ: turnM, winQ: checkWinner() });
    } else if (method !== "online" && !winner) {
      let newBoxes = [...Boxes];
      if (!newBoxes[e]) {
        newBoxes[e] = currentTurn;
        setCurrentTurn(currentTurn === 'X' ? 'O' : 'X');
        setBoxes(newBoxes);
      }
    }
  };

  // Render square
  const renderBox = (num) => <SquareComponent value={Boxes[num]} num={num} />;

  // Handle Socket Events
  useEffect(() => {
    socket.on('board-update', (data) => {
      setBoxes(data.board);
      setCurrentTurn(data.turn);
    });

    socket.on('room-created', () => {
      setConnection(true);
      setClientLog('Waiting for player 2');
      setTurnM('X');
    });

    socket.on('opponent-joined', () => {
      setClientLog('Player 2 joined');
    });

    socket.on('room-exists', () => {
      setClientLog('Room already exists');
    });

    socket.on('room-full', () => {
      setConnection(false);
      setClientLog('Room is full');
    });

    socket.on('joined', () => {
      setClientLog('You joined the room');
      setTurnM('O');
      setConnection(true);
    });

    return () => {
      socket.off("board-update");
      socket.off("room-created");
      socket.off("opponent-joined");
      socket.off("room-exists");
      socket.off("room-full");
      socket.off("joined");
    };
  }, []);

  return (
    <main>
      {method === 'offline' || (method === 'online' && connection) ? (
        <>
          <div>{winner ? `${winner} won` : `Current Turn: ${currentTurn}`}</div>
          {method === 'online' && <div>You: {turnM}</div>}
          <div className="grid-container">
            <div className="column">{renderBox(0)}{renderBox(1)}{renderBox(2)}</div>
            <div className="column">{renderBox(3)}{renderBox(4)}{renderBox(5)}</div>
            <div className="column">{renderBox(6)}{renderBox(7)}{renderBox(8)}</div>
          </div>
        </>
      ) : (
        <>
          <div>Choose a method</div>
          <button onClick={() => setMethod('online')}>Online</button>
          {method === 'online' && !connection && (
            <div className="connection">
              <div>
                <input placeholder="Enter room id" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
                <button onClick={handleConnect}>Connect</button>
              </div>
              <span>or</span>
              <input placeholder="Create room id" value={create} onChange={(e) => setCreate(e.target.value)} />
              <button onClick={handleCreate}>Create Room</button>
            </div>
          )}
          <button onClick={() => setMethod('offline')}>Offline</button>
        </>
      )}
      <div className="client-log">{`Client log: ${clientLog}`}</div>
    </main>
  );
}
