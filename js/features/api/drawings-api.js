const API_BASE_URL = "http://localhost:8080/api";

export async function createCloudDrawing(state, title) {
    const sceneData = {
        elements: state.elements.filter(
            element => !element.isDeleted
        ),

        appState: {
            viewBackgroundColor: state.viewBackgroundColor || "#ffffff",
            gridSize: state.gridSize ?? 20,
            showGrid: state.showGrid ?? true,
            viewport: { ...state.viewport },
            elementProperties: { ...state.elementProperties }
        }
    };

    const response = await fetch(`${API_BASE_URL}/drawings`, {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            title: title,
            sceneData: sceneData
        })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.error || `Save failed: HTTP ${response.status}`
        );
    }

    return data;
}

export async function updateCloudDrawing(id, state, title) {

    const sceneData = {
        elements: state.elements.filter(
            element => !element.isDeleted
        ),

        appState: {
            viewBackgroundColor: state.viewBackgroundColor || "#ffffff",
            gridSize: state.gridSize ?? 20,
            showGrid: state.showGrid ?? true,
            viewport: { ...state.viewport },
            elementProperties: { ...state.elementProperties }
        }
    };

    const response = await fetch(
        `${API_BASE_URL}/drawings/${id}`,
        {
            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                title: title,
                sceneData: sceneData
            })
        }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.error || `Update failed: HTTP ${response.status}`
        );
    }

    return data;
}

export async function getCloudDrawing(id) {

    const response = await fetch(
        `${API_BASE_URL}/drawings/${id}`
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.error || `Load failed: HTTP ${response.status}`
        );
    }

    return data;
}