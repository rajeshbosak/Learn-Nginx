import { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "./config/api";

function App() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");

  const fetchItems = async () => {
    const res = await axios.get(API_ENDPOINTS.GET_ALL_ITEMS);
    setItems(res.data);
  };

  const addItem = async () => {
    if (!newItem) return;
    await axios.post(API_ENDPOINTS.CREATE_ITEM, { name: newItem });
    setNewItem("");
    fetchItems();
  };

  const deleteItem = async (id) => {
    await axios.delete(API_ENDPOINTS.DELETE_ITEM(id));
    fetchItems();
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>{import.meta.env.VITE_APP_NAME}</h1>
      <p>Version: {import.meta.env.VITE_APP_VERSION}</p>

      <h3> Some changes </h3>

      <h2> Some more changes .. .... ... </h2>

      <input
        value={newItem}
        onChange={(e) => setNewItem(e.target.value)}
        placeholder="Enter item name"
      />
      <button onClick={addItem}>Add</button>

      <ul>
        {items?.length > 0 &&
          items?.map((item) => (
            <li key={item.id}>
              {item.name}
              <button onClick={() => deleteItem(item.id)}>❌</button>
            </li>
          ))}
      </ul>
    </div>
  );
}

export default App;
