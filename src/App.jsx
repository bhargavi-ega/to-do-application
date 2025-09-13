import { useState, useEffect, useRef } from 'react';

// The helper components (KebabMenu, TodoForm, etc.) are included for completeness.
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
            {/* FIX: Wrapped todo.text in a span to ensure spacing works correctly */}
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
          /* CSS code from the next code block goes here */
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
