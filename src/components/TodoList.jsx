import TodoItem from './TodoItem';
import './TodoList.css';

function TodoList({ todos, toggleComplete, deleteTodo, editTodo }) {
  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          toggleComplete={toggleComplete}
          deleteTodo={deleteTodo}
          editTodo={editTodo}
        />
      ))}
    </ul>
  );
}

export default TodoList;