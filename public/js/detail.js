let user_id, username, role;

async function getSessionData() {
    try {
        const res = await fetch('/session');
        if (!res.ok) throw new Error("Not logged in");

        const session = await res.json();
        user_id = session.user_id;
        username = session.username;
        role = session.role;

        document.getElementById('Userrole').textContent = username;

    } catch (err) {
        console.error("Session error:", err);
    }
}

function Logout() {
    Swal.fire({
        title: "Do you want to Sign out",
        showCancelButton: true,
        confirmButtonText: "Yes",
    }).then((result) => {
        if (result.isConfirmed) {
            location.replace('/logout');
        }
    });
}

document.getElementById('assetManagement').innerHTML = '<a class="navbar-brand" href="">Asset Borrowing System</a>';

async function borrowbutton() {
    const params = new URLSearchParams(window.location.search);
    const assetId = params.get('id');

    Swal.fire({
        title: "Do you want to borrow this asset?",
        showCancelButton: true,
        confirmButtonText: "Yes",
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch('/borrow-request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        asset_id: assetId,
                        student_id: user_id,
                    })
                });

                if (!res.ok) throw new Error("Borrow request failed");

                Swal.fire("Request Sent!", "Your borrow request has been submitted.", "success")
                    .then(() => {
                        window.location.href = "/welcome/Student"; // ✅ Redirect after success popup
                    });

            } catch (err) {
                console.error("Borrow request error:", err);
                Swal.fire("Error", "Could not submit borrow request", "error");
            }
        }
    });
}



async function getAssetDetail() {
    const params = new URLSearchParams(window.location.search);
    const assetId = params.get('id');

    if (!assetId) {
        alert("Asset ID is missing in the URL.");
        return;
    }

    try {
        const response = await fetch(`/assets/${assetId}`);
        if (response.ok) {
            const asset = await response.json();
            let row = ''
            row += `
                <h1 class="mb-4">Asset Detail</h1>
                <div class="card p-4">
                    <h3>${asset.name}</h3>
                    <p><strong>ID:</strong> <span>${asset.asset_id}</span></p>
                    <p><strong>Category:</strong>${asset.category}</p>
                    <p><strong>Status:</strong> <span>${asset.status}</span></p>
                    <p><strong>Description:</strong> <span>${asset.description}</span></p>`
            if (asset.status === 'available') {
                row += `<button id="borrow-button" onclick="borrowbutton()" class="btn btn-success">Borrow</button>
                </div>`;
            }
            else {
                row += `<button id="Not-Allowed" class="btn btn-danger">Not allowed</button>
                </div>`;
            }
            document.querySelector('#addDetail').innerHTML = row;
        } else {
            throw new Error('Asset not found');
        }
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}
async function disabledBorrowbutton() {
    try {
        const sessionRes = await fetch('/session');
        if (!sessionRes.ok) throw new Error("Not logged in");

        const session = await sessionRes.json();
        const USER = session.user_id;

        if (!USER) {
            console.error("User ID not available.");
            return;
        }

        let hasBorrowed = false;
        let hasPendingRequest = false;

        // 🔹 Check history (borrowed)
        try {
            const historyRes = await fetch(`/history/student/${USER}`);
            if (!historyRes.ok) throw new Error("Failed to fetch history");

            const history = await historyRes.json();
            hasBorrowed = history.some(record => record.status === "borrowed");
        } catch (error) {
            console.error("Error checking history:", error);
        }

        // 🔹 Check borrowrequests (pending)
        try {
            const requestRes = await fetch(`/borrow-request/student/${USER}`);
            if (!requestRes.ok) throw new Error("Failed to fetch borrow requests");

            const requests = await requestRes.json();
            hasPendingRequest = requests.some(record => record.status === "pending");
        } catch (error) {
            console.error("Error checking borrow requests:", error);
        }

        // 🔒 Disable button if either borrowed or pending
        if (hasBorrowed || hasPendingRequest) {
            const buttons = document.querySelectorAll("#borrow-button");
            buttons.forEach((btn) => {
                btn.disabled = true;
                btn.textContent = hasBorrowed ? "Already Borrowed" : "Request Pending";
                btn.classList.remove("btn-success");
                btn.classList.add("btn-secondary");
            });
        }

    } catch (err) {
        console.error("Session error:", err);
    }
}


getSessionData();
getAssetDetail();
disabledBorrowbutton();
