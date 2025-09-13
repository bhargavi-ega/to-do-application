import { useState, useEffect, useRef } from 'react';

function KebabMenu({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="kebab-menu" ref={menuRef}>
      <button className="kebab-button" onClick={() => setIsOpen(!isOpen)}>
        &#x22EE;
      </button>
      {isOpen && <div className="kebab-dropdown" onClick={() => setIsOpen(false)}>{children}</div>}
    </div>
  );
}

function TodoForm({ addTodo }) {
  const [inputValue, setInputValue] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('None');
  const [selectedDueDate, setSelectedDueDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      addTodo(inputValue, selectedPriority, selectedDueDate || null);
      setInputValue('');
      setSelectedPriority('None');
      setSelectedDueDate('');
    }
  };

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Add a new task..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="todo-input"
      />
      <select
        value={selectedPriority}
        onChange={(e) => setSelectedPriority(e.target.value)}
        className="priority-select"
      >
        <option value="None">Priority: None</option>
        <option value="Low">Low</option>
        <option value="Medium">Medium</option>
        <option value="High">High</option>
      </select>
      <input
        type="date"
        value={selectedDueDate}
        onChange={(e) => setSelectedDueDate(e.target.value)}
        className="due-date-input"
      />
      <button type="submit" className="add-button">Add Task</button>
    </form>
  );
}

function TodoItem({ todo, deleteTodo, editTodo, archiveTodo, onDragStart, onDragEnd }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newText, setNewText] = useState(todo.text);

  const handleEdit = () => {
    if (isEditing && newText.trim()) {
      editTodo(todo.id, { text: newText });
    }
    setIsEditing(!isEditing);
  };

  const isOverdue = todo.status !== 'Done' && todo.dueDate && new Date(todo.dueDate) < new Date();

  return (
    <li
      className={`todo-item status-${todo.status.toLowerCase().replace(' ', '-')} ${isOverdue ? 'overdue' : ''}`}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, todo.id)}
      onDragEnd={onDragEnd}
    >
      <div className="todo-content">
        {isEditing ? (
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleEdit() }}
            onBlur={handleEdit}
            className="edit-input"
            autoFocus
          />
        ) : (
          <span className="todo-text">
            <span className="task-name">{todo.text}</span>
            {todo.priority !== 'None' && <span className={`priority-tag ${todo.priority.toLowerCase()}`}>{todo.priority}</span>}
            {todo.dueDate && (
              <span className="due-date">
                Due: {new Date(todo.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </span>
        )}
      </div>
      <KebabMenu>
        <button onClick={handleEdit}>{isEditing ? 'Save' : 'Edit'}</button>
        <button onClick={() => archiveTodo(todo.id)}>Archive</button>
        <button onClick={() => deleteTodo(todo.id, true)}>Delete</button>
      </KebabMenu>
    </li>
  );
}

function StatusColumn({ title, status, todos, onDrop, deleteTodo, editTodo, archiveTodo }) {
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => { onDrop(e, status); setIsDragOver(false); };
  const handleDragStart = (e, todoId) => { e.dataTransfer.setData('todoId', todoId); e.currentTarget.classList.add('dragging'); };
  const handleDragEnd = (e) => e.currentTarget.classList.remove('dragging');

  return (
    <div
      className={`status-column ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h2 className="column-header">{title} ({todos.length})</h2>
      <ul className="todo-list">
        {todos.length === 0 && <li className="empty-list-message">Drag tasks here...</li>}
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            deleteTodo={deleteTodo}
            editTodo={editTodo}
            archiveTodo={archiveTodo}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        ))}
      </ul>
    </div>
  );
}

function ArchiveModal({ archivedTodos, onClose, restoreTodo, deleteTodo }) {
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Archived Tasks ({archivedTodos.length})</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                <ul className="archived-list">
                    {archivedTodos.length === 0 && <p className="empty-archive-message">No archived tasks.</p>}
                    {archivedTodos.map(todo => (
                        <li key={todo.id} className="archived-item">
                            <span className="archived-item-text">{todo.text}</span>
                            <div className="archived-item-actions">
                                <button onClick={() => restoreTodo(todo.id)}>Restore</button>
                                <button onClick={() => deleteTodo(todo.id, false)}>Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

function App() {
  const [todos, setTodos] = useState([]);
  const [filterPriority, setFilterPriority] = useState('All');
  const [sortBy, setSortBy] = useState('dateAdded');
  const [searchQuery, setSearchQuery] = useState('');
  const [isArchiveVisible, setArchiveVisible] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    try {
      const storedTodos = JSON.parse(localStorage.getItem('todos')) || [];
      setTodos(storedTodos);
    } catch (error) {
      console.error("Failed to parse todos from localStorage:", error);
      setTodos([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  useEffect(() => {
    const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    const updatedTodos = todos.map(todo => {
        if (todo.status === 'Done' && todo.completedAt && (now - todo.completedAt > TWENTY_FOUR_HOURS_IN_MS)) {
            return { ...todo, status: 'Archived' };
        }
        return todo;
    });

    if (JSON.stringify(updatedTodos) !== JSON.stringify(todos)) {
      setTodos(updatedTodos);
    }
  }, []);

  const addTodo = (text, priority, dueDate) => {
    const newTodo = { id: Date.now(), text, status: 'Pending', priority: priority || 'None', dueDate: dueDate || null, completedAt: null };
    setTodos(prevTodos => [newTodo, ...prevTodos]);
  };

  const deleteTodo = (id, isPermanent) => {
    if (isPermanent && !window.confirm("Are you sure you want to permanently delete this task?")) return;
    setTodos(todos.filter(todo => todo.id !== id));
  };
  
  const editTodo = (id, updates) => {
    setTodos(todos.map(todo => (todo.id === id ? { ...todo, ...updates } : todo)));
  };

  const archiveTodo = (id) => {
    setTodos(todos.map(todo => todo.id === id ? { ...todo, status: 'Archived' } : todo));
  };

  const handleStatusChangeOnDrop = (e, newStatus) => {
    const todoId = parseInt(e.dataTransfer.getData('todoId'));
    setTodos(prevTodos =>
      prevTodos.map(todo => {
        if (todo.id === todoId) {
          const completedAt = (newStatus === 'Done' && todo.status !== 'Done') ? Date.now() : null;
          return { ...todo, status: newStatus, completedAt };
        }
        return todo;
      })
    );
  };
  
  const restoreTodo = (id) => {
      setTodos(todos.map(todo => todo.id === id ? { ...todo, status: 'Pending' } : todo));
  };

  const getProcessedTodos = () => {
    let processed = todos.filter(todo => todo.status !== 'Archived');

    if (searchQuery) {
        processed = processed.filter(todo => todo.text.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (filterPriority !== 'All') {
      processed = processed.filter(todo => todo.priority === filterPriority);
    }
    
    return [...processed].sort((a, b) => {
      if (sortBy === 'priority') {
        const pOrder = { 'High': 3, 'Medium': 2, 'Low': 1, 'None': 0 };
        return pOrder[b.priority] - pOrder[a.priority];
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1; if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      return b.id - a.id;
    });
  };

  const processedTodos = getProcessedTodos();
  const archivedTodos = todos.filter(todo => todo.status === 'Archived').sort((a, b) => b.completedAt - a.completedAt);
  const groupedByStatus = {
    'Pending': processedTodos.filter(t => t.status === 'Pending'),
    'In Progress': processedTodos.filter(t => t.status === 'In Progress'),
    'Done': processedTodos.filter(t => t.status === 'Done'),
  };
  const doneTaskCount = todos.filter(t => t.status === 'Done').length;
  const totalVisibleTasks = processedTodos.length;

  return (
    <>
      <div className="app-container">
        <style>{`
          :root {
            --font-sans: 'Arial', sans-serif;
            --bg-gradient: linear-gradient(135deg, #e0f2f7 0%, #c4e0f9 100%);
            --bg-app: #ffffff;
            --bg-column: #f7f9fc;
            --bg-item: #ffffff;
            --bg-input: #f7f9fc;
            --bg-button: #457b9d;
            --bg-button-hover: #3b6b8b;
            --bg-modal: #ffffff;
            --bg-switch: #e9e9e9;
            --bg-slider: #457b9d;

            --text-primary: #2c3e50;
            --text-secondary: #555;
            --text-light: #888;
            --text-button: #ffffff;
            --icon-active: #ffffff;
            --icon-inactive: #888;
            --text-modal-header: #2c3e50;
            --text-due-date: #6c757d;
            
            --border-primary: #a8dadc;
            --border-secondary: #e0f2f7;
            --border-focus: #457b9d;
            --border-overdue: #e74c3c;
            
            --shadow-light: rgba(0, 0, 0, 0.05);
            --shadow-medium: rgba(0, 0, 0, 0.15);
            --shadow-focus: rgba(69, 123, 157, 0.3);

            --status-pending: #bdc3c7;
            --status-in-progress: #3498db;
            --status-done: #2ecc71;
            --status-done-bg: #f0fff0;
          }

          body.dark {
            --bg-gradient: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
            --bg-app: #2d3748;
            --bg-column: #1a202c;
            --bg-item: #4a5568;
            --bg-input: #2d3748;
            --bg-button: #63b3ed;
            --bg-button-hover: #90cdf4;
            --bg-modal: #4a5568;
            --bg-switch: #1a202c;
            --bg-slider: #63b3ed;

            --text-primary: #e2e8f0;
            --text-secondary: #a0aec0;
            --text-light: #718096;
            --text-button: #1a202c;
            --icon-active: #ffffff;
            --icon-inactive: #718096;
            --text-modal-header: #ffffff;
            --text-due-date: #a0aec0;

            --border-primary: #4a5568;
            --border-secondary: #2d3748;
            --border-focus: #63b3ed;
            --border-overdue: #fc8181;

            --shadow-light: rgba(0, 0, 0, 0.2);
            --shadow-medium: rgba(0, 0, 0, 0.4);
            --shadow-focus: rgba(99, 179, 237, 0.4);

            --status-done-bg: #2f855a;
          }

          body {
            font-family: var(--font-sans);
            background: var(--bg-gradient);
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 20px;
            transition: background 0.3s ease;
          }

          .app-container {
            background-color: var(--bg-app);
            color: var(--text-primary);
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 8px 30px var(--shadow-medium);
            width: 100%;
            max-width: 1200px;
            transition: background-color 0.3s ease, color 0.3s ease;
          }

          .app-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
          }

          .title {
            font-size: 2.8em;
            color: var(--text-primary);
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 700;
            margin: 0;
          }

          .theme-switch {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 70px;
            padding: 4px;
            border-radius: 50px;
            background-color: var(--bg-switch);
            border: 1px solid var(--border-primary);
            cursor: pointer;
            transition: background-color 0.3s ease;
          }

          .theme-switch::before {
            content: '';
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: var(--bg-slider);
            transition: transform 0.3s ease;
            z-index: 1;
          }

          .theme-switch svg {
            width: 26px;
            height: 26px;
            z-index: 2;
            transition: color 0.3s ease;
          }
          
          .theme-switch .sun-icon { 
            color: var(--icon-active);
            position: relative;
            top: -1px;
          }
          .theme-switch .moon-icon { 
            color: var(--icon-inactive); 
          }
          .theme-switch::before { 
            transform: translateX(0px); 
          }

          body.dark .theme-switch .sun-icon { 
            color: var(--icon-inactive); 
          }
          body.dark .theme-switch .moon-icon { 
            color: var(--icon-active); 
          }
          body.dark .theme-switch::before { 
            transform: translateX(30px);
          }

          .controls-container, .todo-form { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; }
          .search-input, .todo-input, .priority-select, .due-date-input, select { padding: 12px; border: 2px solid var(--border-primary); border-radius: 10px; font-size: 1em; background-color: var(--bg-input); color: var(--text-primary); transition: border-color 0.3s ease, box-shadow 0.3s ease; }
          .search-input:focus, .todo-input:focus, .priority-select:focus, .due-date-input:focus, select:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 8px var(--shadow-focus); }
          .search-input { flex-grow: 2; min-width: 200px; }
          .todo-input { flex-grow: 3; min-width: 250px; }
          .add-button, .archive-button { padding: 12px 25px; border: none; background-color: var(--bg-button); color: var(--text-button); border-radius: 10px; font-size: 1em; font-weight: bold; cursor: pointer; transition: all 0.2s ease-in-out; }
          .add-button:hover, .archive-button:hover { background-color: var(--bg-button-hover); transform: translateY(-2px); box-shadow: 0 4px 15px var(--shadow-light); }
          .stats-bar { display: flex; justify-content: space-between; padding: 10px; background-color: var(--bg-column); border-radius: 8px; margin-bottom: 25px; color: var(--text-secondary); font-weight: bold; }

          .kanban-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .status-column { background-color: var(--bg-column); padding: 15px; border-radius: 12px; display: flex; flex-direction: column; transition: box-shadow 0.3s ease, background-color 0.3s ease; }
          .status-column.drag-over { box-shadow: 0 0 0 3px var(--border-focus); }
          .column-header { font-size: 1.4em; color: var(--text-primary); margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--border-primary); font-weight: 600; }
          .todo-list { list-style: none; padding: 0; margin: 0; min-height: 100px; flex-grow: 1; }
          .todo-item { display: flex; align-items: center; justify-content: space-between; padding: 15px; background-color: var(--bg-item); border-radius: 10px; margin-bottom: 12px; box-shadow: 0 2px 8px var(--shadow-light); border-left: 5px solid transparent; cursor: grab; transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, opacity 0.3s ease, background-color 0.3s ease, border-color 0.3s ease; }
          .todo-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px var(--shadow-light); }
          .todo-item.dragging { opacity: 0.5; transform: rotate(3deg); }
          .todo-item .todo-text { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
          .todo-item.status-pending { border-left-color: var(--status-pending); }
          .todo-item.status-in-progress { border-left-color: var(--status-in-progress); }
          .todo-item.status-done {  border-left-color: var(--status-done); background-color: var(--status-done-bg); }
          .todo-item.status-done .todo-text {  text-decoration: line-through;  color: var(--text-light); }
          .todo-item.overdue { border-left-color: var(--border-overdue); }
          .kebab-menu { position: relative; }
          .kebab-button { background: none; border: none; font-size: 1.8em; cursor: pointer; color: var(--text-light); padding: 0 5px; }
          .kebab-dropdown { position: absolute; background-color: var(--bg-app); min-width: 120px; box-shadow: 0px 8px 16px 0px var(--shadow-medium); z-index: 10; right: 0; border-radius: 8px; overflow: hidden; padding: 5px 0; }
          .kebab-dropdown button { color: var(--text-primary); padding: 10px 16px; display: block; width: 100%; text-align: left; border: none; background: none; cursor: pointer; font-size: 0.95em; }
          .kebab-dropdown button:hover { background-color: var(--bg-column); }

          .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
          .modal-content { background-color: var(--bg-modal); padding: 25px; border-radius: 12px; width: 90%; max-width: 600px; max-height: 80vh; display: flex; flex-direction: column; border: 1px solid var(--border-primary); }
          .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border-primary); padding-bottom: 15px; margin-bottom: 15px; }
          .modal-header h2 { color: var(--text-modal-header); }
          .close-button { background: none; border: none; font-size: 2em; cursor: pointer; color: var(--text-light); }
          .archived-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; }
          .archived-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-radius: 8px; border: 1px solid var(--border-primary); margin-bottom: 10px; }
          .archived-item-actions button { margin-left: 10px; padding: 6px 12px; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-primary); background-color: transparent; color: var(--text-primary); }
          .archived-item-actions button:hover { background-color: var(--bg-column); }
          .empty-archive-message { color: var(--text-secondary); text-align: center; padding: 20px; }
          .archived-item-text { color: var(--text-primary); }

          .priority-tag { padding: 4px 8px; border-radius: 5px; font-size: 0.8em; font-weight: bold; color: white; white-space: nowrap; }
          .priority-tag.low { background-color: #3498db; } .priority-tag.medium { background-color: #f39c12; } .priority-tag.high { background-color: #e74c3c; } .priority-tag.none { background-color: #bdc3c7; color: #333; }
          .due-date { font-size: 0.9em; color: var(--text-due-date); white-space: nowrap; }
          .empty-list-message { color: var(--text-light); font-style: italic; padding: 20px; text-align: center; border: 2px dashed var(--border-primary); border-radius: 8px; }
          .edit-input { flex-grow: 1; padding: 8px; border: 1px solid var(--border-primary); border-radius: 6px; font-size: 1.1em; background-color: var(--bg-input); color: var(--text-primary); }
          body.dark .todo-item.status-done .todo-text { color: #c6f6d5; }
        `}</style>
        
        <header className="app-header">
            <h1 className="title">My To-Do List</h1>
            <button 
              className="theme-switch" 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label="Toggle theme"
            >
              <svg className="sun-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              <svg className="moon-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            </button>
        </header>
        
        <TodoForm addTodo={addTodo} />

        <div className="controls-container">
            <input 
                type="search" 
                placeholder="Search tasks..." 
                className="search-input" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="All">Filter by Priority</option><option value="None">None</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="dateAdded">Sort by Date</option><option value="dueDate">Due Date</option><option value="priority">Priority</option>
            </select>
            <button className="archive-button" onClick={() => setArchiveVisible(true)}>
                View Archive ({archivedTodos.length})
            </button>
        </div>

        <div className="stats-bar">
            <span>Total Tasks: {totalVisibleTasks}</span>
            <span>Completed Today: {doneTaskCount}</span>
        </div>

        <div className="kanban-board">
            <StatusColumn title="Pending" status="Pending" todos={groupedByStatus['Pending']} onDrop={handleStatusChangeOnDrop} deleteTodo={deleteTodo} editTodo={editTodo} archiveTodo={archiveTodo}/>
            <StatusColumn title="In Progress" status="In Progress" todos={groupedByStatus['In Progress']} onDrop={handleStatusChangeOnDrop} deleteTodo={deleteTodo} editTodo={editTodo} archiveTodo={archiveTodo} />
            <StatusColumn title="Done" status="Done" todos={groupedByStatus['Done']} onDrop={handleStatusChangeOnDrop} deleteTodo={deleteTodo} editTodo={editTodo} archiveTodo={archiveTodo} />
        </div>
      </div>
      
      {isArchiveVisible && (
        <ArchiveModal 
            archivedTodos={archivedTodos} 
            onClose={() => setArchiveVisible(false)}
            restoreTodo={restoreTodo}
            deleteTodo={deleteTodo}
        />
      )}
    </>
  );
}

export default App;
