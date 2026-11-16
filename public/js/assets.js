
    let user_id, username, role;
    let allAssets = [];

    async function getData() {
        try {
            const res = await fetch('/session');
            if (!res.ok) throw new Error("Not logged in");

            const session = await res.json();
            user_id = session.user_id;
            username = session.username;
            role = session.role;

            document.getElementById('userrole').textContent = username;
        } catch (err) {
            console.error("Session error:", err);
        }
    }

    document.getElementById('assetManagement').innerHTML = '<a class="navbar-brand" href="">Asset Borrowing System</a>';

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

    async function getAssets() {
        try {
            const response = await fetch('/assets');
            if (!response.ok) throw new Error('Error fetching assets');
            const result = await response.json();
            allAssets = result;
            renderAssets(allAssets);
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    }

    function renderAssets(assets) {
        const table = document.querySelector('#tblAsset');
        table.innerHTML = '';

        assets.forEach(asset => {
            let statusClass = '';
            switch (asset.status.toLowerCase()) {
                case 'available':
                    statusClass = 'status-available'; break;
                case 'borrowed':
                    statusClass = 'status-borrowed'; break;
                case 'pending':
                    statusClass = 'status-pending'; break;
                case 'disabled':
                    statusClass = 'status-disabled'; break;
                default:
                    statusClass = 'status-unknown'; break;
            }

            table.innerHTML += `
                <tr>
                    <td>${asset.asset_id}</td>
                    <td>${asset.name}</td>
                    <td>${asset.category}</td>
                    <td><span class="${statusClass}">${asset.status}</span></td>
                    <td><a href="/detail?id=${asset.asset_id}" class="btn btn-primary">View</a></td>
                </tr>`;
        });
    }

    function filterAssets() {
        const keyword = document.getElementById("searchInput").value.toLowerCase();
        const filtered = allAssets.filter(asset =>
            asset.name.toLowerCase().includes(keyword) ||
            asset.category.toLowerCase().includes(keyword)
        );
        renderAssets(filtered);
    }

    getData();
    getAssets();

