export async function openFileDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("UserFilesDB", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "filename" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFile(filename, fileData) {
  const db = await openFileDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put({ filename, fileData });
    tx.oncomplete = () => resolve(true);
    tx.onerror = (err) => reject(err);
  });
}


export async function deleteFile(filename) {
  const db = await openFileDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    const req = store.delete(filename);
    req.onsuccess = () => resolve(true);
    req.onerror = (err) => reject(err);
  });
}


export async function deleteDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase("UserFilesDB");
    req.onsuccess = () => resolve(true);
    req.onerror = (err) => reject(err);
  });
}
console.log('');
export async function readFile(filename) {
  const db = await openFileDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readonly");
    const store = tx.objectStore("files");
    const req = store.get(filename);
    req.onsuccess = () => resolve(req.result?.fileData || null);
    req.onerror = (err) => reject(err);
  });
}
