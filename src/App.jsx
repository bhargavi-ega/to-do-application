import { useState, useEffect, useRef } from 'react';

// Define KebabMenu component
function KebabMenu({ onEdit, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="kebab-menu" ref={menuRef}>
      <button className="kebab-button" onClick={() => setIsOpen(!isOpen)}>
        &#x22EE; {/* Unicode for three vertical dots */}
      </button>
      {isOpen && (
        <div className="kebab-dropdown">
          <button onClick={() => { onEdit(); setIsOpen(false); }}>Edit</button>
          <button onClick={() => { onDelete(); setIsOpen(false); }}>Delete</button>
        </div>
      )}
    </div>
  );
}

// Define TodoForm component
function TodoForm({ addTodo }) {
  const [inputValue, setInputValue] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('None');
  const [selectedDueDate, setSelectedDueDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      addTodo(inputValue, selectedPriority, selectedDueDate || null); // Pass priority and dueDate
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
        <option value="Low">Priority: Low</option>
        <option value="Medium">Priority: Medium</option>
        <option value="High">Priority: High</option>
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

// Define TodoItem component
function TodoItem({ todo, toggleComplete, deleteTodo, editTodo, onDragStart, onDragOver, onDrop }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newText, setNewText] = useState(todo.text);

  const handleEdit = () => {
    if (isEditing && newText.trim()) {
      editTodo(todo.id, newText);
    }
    setIsEditing(!isEditing);
  };

  // Check if the task is overdue
  const isOverdue = !todo.completed && todo.dueDate && new Date(todo.dueDate) < new Date();

  return (
    <li
      className={`todo-item ${todo.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}
      draggable="true"
      onDragStart={(e) => onDragStart(e, todo.id, todo.date)}
      onDragOver={onDragOver} // Allow dropping
      onDrop={(e) => onDrop(e, todo.id)} // Handle drop for reordering within the same list
      data-todo-id={todo.id} // Custom data attribute for easier retrieval in drag operations
    >
      <div className="todo-content">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => toggleComplete(todo.id)}
          className="todo-checkbox"
        />
        {isEditing ? (
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEdit();
            }}
            className="edit-input"
            autoFocus
          />
        ) : (
          <span className="todo-text">
            {todo.text}
            {todo.priority !== 'None' && <span className={`priority-tag ${todo.priority.toLowerCase()}`}>{todo.priority}</span>}
            {todo.dueDate && (
              <span className="due-date">
                Due: {new Date(todo.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </span>
        )}
      </div>
      <KebabMenu
        onEdit={handleEdit}
        onDelete={() => deleteTodo(todo.id)}
      />
    </li>
  );
}

// Define TodoList component (responsible for a single day's list)
function TodoList({ todos, toggleComplete, deleteTodo, editTodo, onReorder, onDropIntoList, listId }) {
  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e) => {
    // This drop handles a task being dropped onto the list area, not specifically onto another item
    e.preventDefault();
    const draggedTodoId = e.dataTransfer.getData('todoId');
    const draggedTodoOriginalDate = e.dataTransfer.getData('originalDate');
    onDropIntoList(draggedTodoId, draggedTodoOriginalDate, listId);
  };

  // Function to handle reordering when dropping on an item (TodoItem handles its own drop)
  // This function is for handling drops *between* items in the same list.
  const handleItemDrop = (e, dropTargetId) => {
    e.preventDefault();
    const draggedTodoId = e.dataTransfer.getData('todoId');
    if (draggedTodoId && draggedTodoId !== dropTargetId) {
      onReorder(draggedTodoId, dropTargetId, listId); // Pass listId for reordering within list
    }
  };


  return (
    <ul
      className="todo-list"
      onDragOver={handleDragOver}
      onDrop={handleDrop} // Handle dropping onto an empty list or general list area
    >
      {todos.length === 0 && (
        <li className="empty-list-message">Drag tasks here or add new ones!</li>
      )}
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          toggleComplete={toggleComplete}
          deleteTodo={deleteTodo}
          editTodo={editTodo}
          onDragStart={(e, id, date) => {
            e.dataTransfer.setData('todoId', id);
            e.dataTransfer.setData('originalDate', date || 'unscheduled'); // Store original date
            e.currentTarget.classList.add('dragging'); // Add dragging class for visual feedback
          }}
          onDragOver={handleDragOver} // Allow dropping on item
          onDrop={handleItemDrop} // Handle reordering when dropping on an item
        />
      ))}
    </ul>
  );
}

// Main App component
function App() {
  const [todos, setTodos] = useState([]);
  const [filterPriority, setFilterPriority] = useState('All');
  const [sortBy, setSortBy] = useState('dateAdded'); // 'dateAdded', 'dueDate', 'priority'

  // Load todos from local storage on initial render
  useEffect(() => {
    try {
      const storedTodos = JSON.parse(localStorage.getItem('todos')) || [];
      setTodos(storedTodos);
    } catch (error) {
      console.error("Failed to parse todos from localStorage:", error);
      setTodos([]);
    }
  }, []);

  // Save todos to local storage whenever the todos state changes
  useEffect(() => {
    try {
      localStorage.setItem('todos', JSON.stringify(todos));
    } catch (error) {
      console.error("Failed to save todos to localStorage:", error);
    }
  }, [todos]);

  // Function to add a new todo
  const addTodo = (text, priority, dueDate) => {
    if (text.trim()) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
      const newTodo = {
        id: Date.now(),
        text,
        completed: false,
        date: today, // New todos default to today's date
        priority: priority || 'None',
        dueDate: dueDate || null,
      };
      setTodos([...todos, newTodo]);
    }
  };

  // Function to toggle the completion status of a todo
  const toggleComplete = (id) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // Function to delete a todo
  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  // Function to edit a todo's text
  const editTodo = (id, newText) => {
    setTodos(
      todos.map(todo => 
        todo.id === id ? { ...todo, text: newText } : todo
      )
    );
  };

  // Function to handle reordering within the same list (dragged on top of another item)
  const reorderTodosWithinList = (draggedId, droppedOnId, targetListDate) => {
    setTodos(prevTodos => {
      const todosInTargetList = prevTodos.filter(todo => (todo.date || 'unscheduled') === (targetListDate || 'unscheduled'));
      const otherTodos = prevTodos.filter(todo => (todo.date || 'unscheduled') !== (targetListDate || 'unscheduled'));

      const draggedIndex = todosInTargetList.findIndex(todo => todo.id === parseInt(draggedId));
      const droppedOnIndex = todosInTargetList.findIndex(todo => todo.id === parseInt(droppedOnId));

      if (draggedIndex === -1 || droppedOnIndex === -1) return prevTodos;

      const [draggedTodo] = todosInTargetList.splice(draggedIndex, 1);
      todosInTargetList.splice(droppedOnIndex, 0, draggedTodo);

      return [...otherTodos, ...todosInTargetList];
    });
  };

  // Function to handle dropping a task onto a new list (date section or unscheduled)
  const handleDropIntoList = (draggedId, originalDate, targetDate) => {
    setTodos(prevTodos => {
      const newTodos = prevTodos.map(todo => {
        if (todo.id === parseInt(draggedId)) {
          return { ...todo, date: targetDate === 'unscheduled' ? null : targetDate };
        }
        return todo;
      });
      return newTodos;
    });
  };

  // Filter and sort todos before grouping
  const getFilteredAndSortedTodos = (allTodos) => {
    let filtered = allTodos;

    // Filter by priority
    if (filterPriority !== 'All') {
      filtered = filtered.filter(todo => todo.priority === filterPriority);
    }

    // Sort todos
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'dateAdded') {
        return a.id - b.id; // Sort by creation time
      } else if (sortBy === 'dueDate') {
        // Handle null due dates: nulls come last
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      } else if (sortBy === 'priority') {
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1, 'None': 0 };
        return priorityOrder[b.priority] - priorityOrder[a.priority]; // High to Low
      }
      return 0;
    });
    return sorted;
  };

  const processedTodos = getFilteredAndSortedTodos(todos);

  // Group todos by date (or null for unscheduled)
  const groupedTodos = processedTodos.reduce((acc, todo) => {
    const dateKey = todo.date || 'unscheduled'; // Use 'unscheduled' key for tasks without a date
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(todo);
    return acc;
  }, {});

  // Sort dates for display, ensuring 'unscheduled' comes first
  const sortedDates = Object.keys(groupedTodos).sort((a, b) => {
    if (a === 'unscheduled') return -1;
    if (b === 'unscheduled') return 1;
    return new Date(a) - new Date(b);
  });

  const completedTaskCount = todos.filter(todo => todo.completed).length;


  return (
    <div className="app-container">
      {/* All CSS styles embedded here */}
      <style>
        {`
        body {
          font-family: 'Arial', sans-serif;
          background: linear-gradient(135deg, #e0f2f7 0%, #c4e0f9 100%); /* Soft blue gradient */
          display: flex;
          justify-content: center;
          align-items: flex-start; /* Align items to the top for scrollable content */
          min-height: 100vh;
          margin: 0;
          box-sizing: border-box;
          padding: 20px;
          overflow-y: auto; /* Allow scrolling if content overflows */
        }

        .app-container {
          background-color: #ffffff;
          padding: 40px;
          border-radius: 15px; /* Slightly more rounded */
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15); /* Stronger, softer shadow */
          width: 100%;
          max-width: 550px; /* Slightly wider */
          text-align: center;
          margin: 20px auto; /* Center with margin */
        }

        .title {
          font-size: 2.8em; /* Slightly larger title */
          color: #2c3e50; /* Darker, more professional blue-grey */
          margin-bottom: 25px; /* More space below title */
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 700; /* Bolder title */
        }

        .completed-count {
            font-size: 1.1em;
            color: #28a745;
            margin-bottom: 20px;
            font-weight: bold;
        }

        /* Filter and Sort Controls */
        .controls-container {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 25px;
            flex-wrap: wrap; /* Allow wrapping on small screens */
        }

        .controls-container select {
            padding: 10px 15px;
            border: 1px solid #a8dadc;
            border-radius: 8px;
            background-color: #f7f9fc;
            font-size: 1em;
            color: #333;
            cursor: pointer;
            flex: 1; /* Allow flex growing */
            min-width: 150px; /* Ensure they don't get too small */
        }

        /* TodoForm styles */
        .todo-form {
          display: flex;
          flex-wrap: wrap; /* Allow wrapping on small screens */
          gap: 10px;
          margin-bottom: 30px; /* More space below form */
          justify-content: center;
        }

        .todo-input {
          flex-grow: 1;
          padding: 14px;
          border: 2px solid #a8dadc;
          border-radius: 10px;
          font-size: 1.1em;
          transition: border-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
          min-width: 180px; /* Ensure input is not too small */
        }

        .priority-select, .due-date-input {
            padding: 14px;
            border: 2px solid #a8dadc;
            border-radius: 10px;
            font-size: 1.1em;
            background-color: #f7f9fc;
            color: #333;
            cursor: pointer;
            min-width: 150px; /* Ensure fields are not too small */
        }


        .todo-input:focus, .priority-select:focus, .due-date-input:focus {
          outline: none;
          border-color: #457b9d;
          box-shadow: 0 0 8px rgba(69, 123, 157, 0.3);
        }

        .add-button {
          padding: 14px 25px;
          border: none;
          background-color: #457b9d;
          color: white;
          border-radius: 10px;
          font-size: 1.1em;
          cursor: pointer;
          transition: background-color 0.3s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.3s ease-in-out;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }

        .add-button:hover {
          background-color: #3b6b8b;
          transform: translateY(-3px);
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
        }

        /* Date Section styles */
        .date-section {
          margin-top: 30px;
          margin-bottom: 30px;
          background-color: #f7f9fc;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          transition: box-shadow 0.3s ease-in-out; /* For drag over effect */
        }

        .date-section.drag-over {
          box-shadow: 0 0 0 3px #4CAF50, 0 2px 10px rgba(0, 0, 0, 0.05); /* Highlight on drag over */
        }

        .date-header {
          font-size: 1.5em;
          color: #2c3e50;
          margin-bottom: 15px;
          border-bottom: 2px solid #a8dadc;
          padding-bottom: 10px;
          font-weight: 600;
        }

        /* TodoList styles */
        .todo-list {
          list-style: none;
          padding: 0;
          margin: 0;
          min-height: 50px; /* Ensure drop zone is visible when empty */
        }

        .empty-list-message {
          color: #888;
          font-style: italic;
          padding: 20px;
          text-align: center;
        }

        /* TodoItem styles */
        .todo-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px;
          background-color: #ffffff;
          border: 1px solid #e0f2f7;
          border-radius: 10px;
          margin-bottom: 12px;
          transition: background-color 0.3s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.3s ease-in-out, opacity 0.3s ease-in-out; /* Added opacity for dragging */
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          cursor: grab; /* Indicate draggable */
        }

        .todo-item:active {
          cursor: grabbing;
        }

        .todo-item.completed {
          background-color: #e6ffe6; /* Light green for completed tasks */
          border-color: #c8e6c9;
        }

        .todo-item.overdue {
          border-left: 5px solid #e74c3c; /* Red border for overdue */
          background-color: #ffe6e6; /* Light red background */
        }

        .todo-item.dragging {
          opacity: 0.5; /* Visual feedback when dragging */
          border: 2px dashed #4CAF50; /* Dashed border for dragging */
        }

        .todo-content {
          display: flex;
          align-items: center;
          flex-grow: 1;
          gap: 10px;
        }

        .todo-checkbox {
          transform: scale(1.4); /* Make checkbox larger */
          margin-right: 5px;
          cursor: pointer;
          accent-color: #28a745; /* Green checkbox */
        }

        .todo-text {
          flex-grow: 1;
          text-align: left;
          font-size: 1.1em;
          color: #333;
          word-break: break-word;
          padding-right: 10px;
          display: flex;
          flex-wrap: wrap; /* Allow text and tags to wrap */
          align-items: center;
          gap: 8px; /* Space between text, priority, date */
        }

        .todo-item.completed .todo-text {
          text-decoration: line-through;
          color: #6a6a6a;
        }

        .priority-tag {
            padding: 4px 8px;
            border-radius: 5px;
            font-size: 0.8em;
            font-weight: bold;
            color: white;
            white-space: nowrap; /* Prevent tag from breaking */
        }
        .priority-tag.low { background-color: #3498db; } /* Blue */
        .priority-tag.medium { background-color: #f39c12; } /* Orange */
        .priority-tag.high { background-color: #e74c3c; } /* Red */
        .priority-tag.none { background-color: #bdc3c7; color: #333; } /* Grey */


        .due-date {
            font-size: 0.9em;
            color: #555;
            white-space: nowrap;
        }

        .todo-item.overdue .due-date {
            color: #c0392b; /* Darker red for overdue date text */
            font-weight: bold;
        }

        .edit-input {
          flex-grow: 1;
          padding: 8px;
          border: 1px solid #b3cdd1;
          border-radius: 6px;
          font-size: 1.1em;
        }

        /* Kebab menu styles */
        .kebab-menu {
          position: relative;
          display: inline-block;
        }

        .kebab-button {
          background: none;
          border: none;
          font-size: 1.8em;
          cursor: pointer;
          color: #888;
          padding: 0 5px;
          transition: color 0.2s ease-in-out;
        }

        .kebab-button:hover {
          color: #333;
        }

        .kebab-dropdown {
          position: absolute;
          background-color: #ffffff;
          min-width: 120px;
          box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
          z-index: 10; /* Higher z-index to appear on top */
          right: 0;
          border-radius: 8px;
          overflow: hidden;
          padding: 5px 0;
        }

        .kebab-dropdown button {
          color: #333;
          padding: 10px 16px;
          text-decoration: none;
          display: block;
          width: 100%;
          text-align: left;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 0.95em;
          transition: background-color 0.2s ease-in-out;
        }

        .kebab-dropdown button:hover {
          background-color: #f1f1f1;
        }

        .no-tasks-message {
          color: #666;
          font-style: italic;
          margin-top: 20px;
        }

        /* Responsive adjustments */
        @media (max-width: 600px) {
          .app-container {
            padding: 20px;
            margin: 10px;
            border-radius: 10px;
          }

          .title {
            font-size: 2em;
            margin-bottom: 20px;
          }

          .completed-count {
            font-size: 1em;
          }

          .controls-container {
            flex-direction: column;
            gap: 10px;
          }

          .controls-container select {
            width: 100%;
            min-width: unset;
          }

          .todo-form {
            flex-direction: column;
            gap: 8px;
            margin-bottom: 20px;
          }

          .todo-input, .priority-select, .due-date-input, .add-button {
            width: 100%;
            padding: 12px;
            font-size: 0.95em;
            min-width: unset;
          }

          .add-button {
            padding: 12px 20px;
          }

          .date-section {
            padding: 15px;
            margin-top: 20px;
            margin-bottom: 20px;
          }

          .date-header {
            font-size: 1.3em;
            margin-bottom: 10px;
          }

          .todo-item {
            flex-direction: column;
            align-items: flex-start;
            padding: 12px;
            margin-bottom: 8px;
            border-radius: 8px;
          }

          .todo-content {
            width: 100%;
            margin-bottom: 10px;
          }

          .todo-text {
            font-size: 1.05em;
            padding-right: 0;
            flex-direction: column; /* Stack priority/date below text on small screens */
            align-items: flex-start;
            gap: 5px;
          }

          .priority-tag, .due-date {
            font-size: 0.8em;
            margin-top: 0px; /* Adjust spacing */
          }


          .edit-input {
            width: 100%;
            margin-bottom: 10px;
            font-size: 1.05em;
            padding: 8px;
          }

          .kebab-menu {
            position: static;
            align-self: flex-end;
            margin-top: -30px;
            margin-right: 5px;
          }

          .kebab-dropdown {
            position: absolute;
            right: 10px;
            top: auto;
            bottom: auto;
          }
        }
        `}
      </style>
      <h1 className="title">My To-Do List</h1>
      <TodoForm addTodo={addTodo} />

      <div className="completed-count">
          Completed Tasks: {completedTaskCount}
      </div>

      <div className="controls-container">
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="All">Filter by Priority: All</option>
          <option value="None">Filter by Priority: None</option>
          <option value="Low">Filter by Priority: Low</option>
          <option value="Medium">Filter by Priority: Medium</option>
          <option value="High">Filter by Priority: High</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="dateAdded">Sort by: Date Added</option>
          <option value="dueDate">Sort by: Due Date</option>
          <option value="priority">Sort by: Priority</option>
        </select>
      </div>

      {/* Unscheduled Tasks Section */}
      <div
        className={`date-section`}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('drag-over');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('drag-over');
        }}
        onDrop={(e) => {
          e.currentTarget.classList.remove('drag-over');
          const draggedTodoId = e.dataTransfer.getData('todoId');
          const originalDate = e.dataTransfer.getData('originalDate');
          if (draggedTodoId && originalDate !== 'unscheduled') {
            handleDropIntoList(draggedTodoId, originalDate, null); // Set date to null for unscheduled
          }
        }}
      >
        <h2 className="date-header">Unscheduled Tasks</h2>
        <TodoList
          todos={groupedTodos['unscheduled'] || []}
          toggleComplete={toggleComplete}
          deleteTodo={deleteTodo}
          editTodo={editTodo}
          onReorder={reorderTodosWithinList} // Reorder within unscheduled list
          onDropIntoList={handleDropIntoList} // Drop onto unscheduled list itself
          listId={null} // List ID for unscheduled
        />
      </div>

      {/* Daily Task Sections */}
      {sortedDates.filter(date => date !== 'unscheduled').length === 0 && todos.filter(todo => todo.date !== null).length === 0 && (
        <p className="no-tasks-message">No daily tasks yet! Add one or drag an unscheduled task here. 🚀</p>
      )}

      {sortedDates.filter(date => date !== 'unscheduled').map(date => (
        <div
          key={date}
          className={`date-section`}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove('drag-over');
          }}
          onDrop={(e) => {
            e.currentTarget.classList.remove('drag-over');
            const draggedTodoId = e.dataTransfer.getData('todoId');
            const originalDate = e.dataTransfer.getData('originalDate');
            if (draggedTodoId && originalDate !== date) { // Only update if moving to a different date
              handleDropIntoList(draggedTodoId, originalDate, date);
            }
          }}
        >
          <h2 className="date-header">
            {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
          <TodoList
            todos={groupedTodos[date]}
            toggleComplete={toggleComplete}
            deleteTodo={deleteTodo}
            editTodo={editTodo}
            onReorder={reorderTodosWithinList} // Reorder within daily list
            onDropIntoList={handleDropIntoList} // Drop onto daily list itself
            listId={date} // List ID for daily list
          />
        </div>
      ))}
    </div>
  );
}

export default App;
