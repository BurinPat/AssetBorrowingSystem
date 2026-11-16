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
        fetchHistory(); // Only call this after session is loaded
    } catch (err) {
        console.error("Session error:", err);
    }
}

async function fetchHistory() {
    try {
        const res = await fetch(`/history/student/${user_id}`);
        const data = await res.json();

        const tableBody = document.getElementById("borrowHistory");
        data.forEach(item => {
            tableBody.innerHTML += `
                <tr>
                    <td>${item.asset_name}</td>
                    <td>${formatDate(item.borrow_date)}</td>
                    <td>${formatDate(item.return_date)}</td>
                    <td>${item.status}</td>
                    <td>${username}</td>
                    <td>${item.approver || '-'}</td>
                </tr>`;
        });
    } catch (error) {
        console.error("Error fetching history:", error);
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

getSessionData(); // Start the process

document.getElementById('assetManagement').innerHTML = '<a class="navbar-brand" href="">Asset Borrowing System</a>';


// Logout function
function Logout() {
    Swal.fire({
        title: "Do you want to Sign out?",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "Cancel",
        customClass: {
            confirmButton: 'btn btn-primary',
            cancelButton: 'btn btn-success'
        },
        buttonsStyling: false,
        showClass: {
            popup: 'animate__animated animate__fadeIn'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOut'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            location.replace('/logout');
        }
    });
}
