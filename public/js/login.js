const formlogin = document.querySelector('#loginForm');

// Check if user is already logged in

formlogin.onsubmit = async function (e) {
    e.preventDefault();
    const username = formlogin.username.value;
    const password = formlogin.password.value;

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    };

    try {
        const response = await fetch('/login', options);
        if (response.ok) {
            const result = await response.json(); // Parse JSON
            location.replace(result.redirect); // Redirect to welcome page
        } else if (response.status === 401) {
            const result = await response.text();
            throw new Error(result);
        } else {
            throw new Error('Internal Server Error');
        }
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
};
