const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt')
const con = require('./config/db');
const app = express();
const session = require('express-session');
const memoryStore = require('memorystore')(session);


app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.json());

//session config
app.use(session({
    secret: 'WebProj',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 86400000 },
    store: new memoryStore({ checkPeriod: 86400000 })
}));
//call session
app.get('/session', function (req, res) {
    if (req.session.username && req.session.userID) {
        res.json({
            user_id: req.session.userID,
            username: req.session.username,
            role: req.session.userRole
        });
    } else {
        res.status(401).json({ message: 'Not logged in' });
    }
});
app.get('/password/:password', function (req, res) {
    const password = req.params.password; // Access password parameter from URL
    bcrypt.hash(password, 10, function (err, hash) {
        if (err) {
            console.error(err);
            return res.status(505).send('Password Hashing Error');
        }
        return res.status(200).send(hash); // Send hashed password back
    });
});

//=======================================Users table=============================================
//login
app.post('/login', function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    const sql = 'SELECT user_id, username, password ,role FROM users WHERE username = ?';
    con.query(sql, [username], function (err, result) {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        } else {
            if (result.length != 1) {
                res.status(401).send('Wrong username');
            } else {
                //verify password
                bcrypt.compare(password, result[0].password, function (err, isMatch) {
                    if (err) {
                        res.status(505).send('Authentication Server Error');
                    } else {
                        if (isMatch) {
                            req.session.userID = result[0].user_id;
                            req.session.username = result[0].username;
                            req.session.userRole = result[0].role;
                            if (req.session.userRole === "Student") {
                                res.status(200).json({
                                    redirect: '/welcome/Student' //correct Student login
                                });
                            } else if (req.session.userRole === "Staff") {
                                res.status(200).json({
                                    redirect: '/welcome/Staff'//correct Staff login
                                });
                            }
                            else if (req.session.userRole === "Lecturer") {
                                res.status(200).json({
                                    redirect: 'welcome/Lecturer'
                                })
                            }
                        } else {
                            //wrong password
                            res.status(401).send('Wrong password');
                        }

                    }
                });

            }
        }
    })
});
//logout
app.get('/logout', (req, res) => {
    req.session.destroy(function (err) {
        if (err) {
            return res.status(500).send('Logout error')
        }
        res.redirect('/')
    })
})
//get Registration
app.post('/Registration', function (req, res) {
    const full_name = req.body.full_name;
    const student_id = req.body.student_id;
    const username = req.body.username;
    const password = req.body.password;
    const sql = "INSERT INTO users(full_name,student_id,username,password,role) VALUES(?,?,?,?,'Student')";
    bcrypt.hash(password, 10, function (err, hash) {
        if (err) {
            console.error(err);
            return res.status(505).send('Password Hashing Error');
        }
        con.query(sql, [full_name, student_id, username, hash], function (err, result) {
            console.log(hash)
            if (err) {
                console.error(err);
                return res.status(500).send("Database Server Error")
            }
            if (result.affectedRows != 1) {
                console.error("Insert Error");
                return res.status(501).send("Insert Error");
            }
            res.status(200).send('Registration Completed')
        })
    });

})

//=======================================Assets table=============================================
// Endpoint to get asset details by asset_id
app.get('/assets/:asset_id', function (req, res) {
    const assetId = req.params.asset_id; // Get asset_id from URL parameter

    // Query database to fetch asset details based on asset_id
    const sql = 'SELECT * FROM assets WHERE asset_id = ?';
    con.query(sql, [assetId], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        if (result.length === 1) {
            res.json(result[0]); // Return asset details as JSON
        } else {
            res.status(404).send('Asset not found');
        }
    });
});

//get all assets
app.get('/assets', function (req, res) {
    const sql = "SELECT * FROM assets";
    con.query(sql, function (err, result) {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        }
        res.status(200).json(result);
    })
})

// Add a new asset
app.post('/addAssets', function (req, res) {
    const { name, category, description } = req.body;

    // Validate required fields
    if (!name || !category) {
        return res.status(400).send('Name and category are required');
    }

    const sql = 'INSERT INTO assets (name, category, description, status) VALUES (?, ?, ?, "available")';
    con.query(sql, [name, category, description], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Error adding asset');
        }
        res.status(200).json(result);
    });
});

// Delete an asset and all related records
app.delete('/deleteAssets/:asset_id', function (req, res) {
    const assetId = req.params.asset_id;

    // First check if the asset exists
    const checkSql = 'SELECT * FROM assets WHERE asset_id = ?';
    con.query(checkSql, [assetId], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }

        if (result.length === 0) {
            return res.status(404).send('Asset not found');
        }

        // Step 1: Get all request_ids tied to this asset
        const getRequestIdsSql = 'SELECT request_id FROM borrowrequests WHERE asset_id = ?';
        con.query(getRequestIdsSql, [assetId], function (err, requests) {
            if (err) {
                console.error(err);
                return res.status(500).send('Error retrieving request IDs');
            }

            const requestIds = requests.map(r => r.request_id);

            // Step 2: Delete from approvals (if any)
            if (requestIds.length > 0) {
                const deleteApprovalsSql = 'DELETE FROM approvals WHERE request_id IN (?)';
                con.query(deleteApprovalsSql, [requestIds], function (err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Error deleting approvals');
                    }

                    proceedToDeleteBorrowRequests();
                });
            } else {
                proceedToDeleteBorrowRequests();
            }

            // Step 3: Delete borrow requests, then asset
            function proceedToDeleteBorrowRequests() {
                const deleteRequestsSql = 'DELETE FROM borrowrequests WHERE asset_id = ?';
                con.query(deleteRequestsSql, [assetId], function (err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Error deleting borrow requests');
                    }

                    // Step 4: Delete asset
                    const deleteAssetSql = 'DELETE FROM assets WHERE asset_id = ?';
                    con.query(deleteAssetSql, [assetId], function (err) {
                        if (err) {
                            console.error(err);
                            return res.status(501).send('Error deleting asset');
                        }

                        res.status(200).send('Asset and all related data deleted successfully');
                    });
                });
            }
        });
    });
});


//Edit
app.put('/editAssets/:asset_id', function (req, res) {
    const asset_id = req.params.asset_id;
    const { name, category, status, description } = req.body;

    const sql = `UPDATE assets SET name = ?, category = ?, status = ?, description = ? WHERE asset_id = ?`;

    con.query(sql, [name, category, status, description, asset_id], function (err, result) {
        if (err) {
            console.error('Error updating asset:', err);
            return res.status(500).send('Database error');
        }
        res.status(200).json({ message: 'Asset updated successfully' });
    });
});

//=======================================History table=============================================
//Add history 
// Add history
app.post('/addHistory/:request_id', function (req, res) {
    const requestID = req.params.request_id;
    const { asset_id, student_id, approver_id } = req.body;

    const checkSql = `
        SELECT * FROM borrowrequests
        WHERE request_id = ? AND status = 'approved' AND history_added = FALSE
    `;

    con.query(checkSql, [requestID], function (err, results) {
        if (err) {
            console.error('Check borrowrequest error:', err);
            return res.status(500).send('Error checking borrow request');
        }

        if (results.length === 0) {
            return res.status(409).json({ message: 'History already exists or request is invalid' });
        }

        const insertSql = `
            INSERT INTO history (asset_id, student_id, borrow_date, return_date, status, approver_id)
            SELECT asset_id, student_id, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'borrowed', ?
            FROM borrowrequests
            WHERE request_id = ? AND status = 'approved'
            LIMIT 1;
        `;

        con.query(insertSql, [approver_id, requestID], function (err, result) {
            if (err) {
                console.error('Insert history error:', err);
                return res.status(500).send('Error adding history');
            }

            // After inserting, mark as added
            const updateSql = `UPDATE borrowrequests SET history_added = TRUE WHERE request_id = ?`;
            con.query(updateSql, [requestID], function (err) {
                if (err) {
                    console.error('Update flag error:', err);
                    return res.status(500).send('History added, but failed to update flag');
                }

                res.status(200).json({ message: 'History added successfully', result });
            });
        });
    });
});


// API to get borrowing history by student_id
app.get('/history/student/:student_id', function (req, res) {
    const studentId = req.params.student_id; // Get student_id from URL parameter

    // Query database to fetch borrowing history based on student_id
    const sql = `
        SELECT h.history_id, h.borrow_date, h.return_date, h.status, a.name AS asset_name, u.username AS approver
        FROM history h
        JOIN assets a ON h.asset_id = a.asset_id
        JOIN users u ON h.approver_id = u.user_id
        WHERE h.student_id = ?
        ORDER BY h.borrow_date DESC;
    `;

    con.query(sql, [studentId], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        if (result.length > 0) {
            res.status(200).json(result); // Return history as JSON
        } else {
            res.status(404).send('No borrowing history found for this student');
        }
    });
});

//lecturer history
app.get('/history/approver/:approver_id', function (req, res) {
    const approverId = req.params.approver_id; // Get approver_id from URL parameter

    // Query database to fetch borrowing history approved by this approver
    const sql = `
        SELECT 
            h.history_id, 
            h.borrow_date, 
            h.return_date, 
            h.status, 
            a.name AS asset_name, 
            s.full_name AS student_name
        FROM history h
        JOIN assets a ON h.asset_id = a.asset_id
        JOIN users s ON h.student_id = s.user_id
        WHERE h.approver_id = ?
        ORDER BY h.borrow_date DESC;
    `;

    con.query(sql, [approverId], function (err, result) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Internal Server Error');
        }

        if (result.length > 0) {
            res.status(200).json(result); // Return history as JSON
        } else {
            res.status(404).send('No borrowing history found for this approver');
        }
    });
});





// API to get all borrowing history
app.get('/history', function (req, res) {
    const sql = `
        SELECT 
            h.history_id, 
            h.borrow_date, 
            h.return_date, 
            h.status, 
            h.student_id, 
            u.full_name AS borrower, 
            approver.full_name AS approver, 
            a.name AS asset_name,
            a.asset_id
        FROM history h
        JOIN users u ON h.student_id = u.user_id
        JOIN users approver ON h.approver_id = approver.user_id
        JOIN assets a ON h.asset_id = a.asset_id
        ORDER BY h.borrow_date DESC;
    `;

    con.query(sql, function (err, result) {
        if (err) {
            console.error("Error fetching history:", err);
            return res.status(500).send('Internal Server Error');
        }

        res.status(200).json(result); // Return history as JSON
    });
});

//Dashboard
app.get('/statusCount', function (req, res) {
    const sql = `SELECT status, COUNT(*) AS count 
                 FROM assets 
                 GROUP BY status`;

    con.query(sql, function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Database Server Error');
        }

        // Return the count of assets per status as JSON
        res.status(200).json(result);
    });
});



//returned
app.post('/mark-returned', function (req, res) {
    const { asset_id, student_id } = req.body;

    console.log('Marking returned:', { asset_id, student_id });

    if (!asset_id || !student_id) {
        return res.status(400).send('Asset ID and Student ID are required');
    }

    // Update history table instead
    const updateHistorySQL = `
        UPDATE history
        SET status = 'returned'
        WHERE asset_id = ? AND student_id = ? AND status = 'borrowed'
    `;

    const updateAssetSQL = `
        UPDATE assets
        SET status = 'available'
        WHERE asset_id = ?
    `;

    con.query(updateHistorySQL, [asset_id, student_id], function (err, result) {
        if (err) {
            console.error('Error updating history:', err);
            return res.status(500).send('Database error');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('No matching borrowed record found in history');
        }

        con.query(updateAssetSQL, [asset_id], function (err2) {
            if (err2) {
                console.error('Error updating asset:', err2);
                return res.status(500).send('Failed to update asset status');
            }

            res.status(200).json({ message: 'Asset marked as returned successfully' });
        });
    });
});





//=======================================Borrowrequests table=============================================
// Borrow request (student)

app.post('/borrow-request', function (req, res) {
    const student_id = req.body.student_id;
    const asset_id = req.body.asset_id;

    if (!student_id || !asset_id) {
        return res.status(400).send('All fields are required');
    }

    const sql = `
      INSERT INTO borrowrequests (student_id, asset_id, borrow_date, return_date, status)
      VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'pending')
    `;

    con.query(sql, [student_id, asset_id], function (err, result) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error creating borrow request');
        }

        //  UPDATE THE ASSET STATUS TO 'Pending' HERE:
        const updateAssetStatus = `UPDATE assets SET status = 'pending' WHERE asset_id = ?`;
        con.query(updateAssetStatus, [asset_id], function (err2) {
            if (err2) {
                console.error('Error updating asset status:', err2);
                return res.status(500).send('Borrow request created but failed to update asset status');
            }
            res.status(201).json({ message: 'Borrow request submitted and asset status updated' });
        });
    });
});



// Approve borrow request (lecturer)
app.put('/borrow-request/:id/approve', (req, res) => {
    const requestId = req.params.id;
    const approverId = req.session.userID;

    if (!approverId) {
        return res.status(403).send("Unauthorized: Approver not logged in");
    }

    // 1. Update request to approved
    const updateRequestSQL = `UPDATE borrowrequests SET status = 'approved' WHERE request_id = ?`;
    con.query(updateRequestSQL, [requestId], (err) => {
        if (err) return res.status(500).send('Error updating request status');

        // 2. Insert into approvals table
        const insertApprovalSQL = `
            INSERT INTO approvals (request_id, approver_id, approval_status, approval_date)
            VALUES (?, ?, 'approved', NOW())
        `;
        con.query(insertApprovalSQL, [requestId, approverId], (err2) => {
            if (err2) return res.status(500).send('Error inserting into approvals');

            // 3. Insert into history table
            const insertHistorySQL = `
                INSERT INTO history (asset_id, student_id, borrow_date, return_date, status, approver_id)
                SELECT asset_id, student_id, borrow_date, return_date, 'borrowed', ?
                FROM borrowrequests
                WHERE request_id = ? AND history_added = FALSE
                LIMIT 1
            `;
            con.query(insertHistorySQL, [approverId, requestId], (err3, result) => {
                if (err3) return res.status(500).send('Error inserting into history');

                // 4. Update history_added flag
                const updateFlagSQL = `UPDATE borrowrequests SET history_added = TRUE WHERE request_id = ?`;
                con.query(updateFlagSQL, [requestId], (err4) => {
                    if (err4) return res.status(500).send('Approved but failed to update history flag');

                    // 5. Update asset status
                    const updateAssetSQL = `
                        UPDATE assets
                        SET status = 'Borrowed'
                        WHERE asset_id = (SELECT asset_id FROM borrowrequests WHERE request_id = ?)
                    `;
                    con.query(updateAssetSQL, [requestId], (err5) => {
                        if (err5) return res.status(500).send('History recorded but failed to update asset');

                        res.status(200).send('Request approved and history recorded');
                    });
                });
            });
        });
    });
});

// API to get borrowrequest by student_id
app.get('/borrow-request/student/:student_id', function (req, res) {
    const studentId = req.params.student_id; // Get student_id from URL parameter

    // Query database to fetch borrowing history based on student_id
    const sql = `
SELECT 
b.request_id,
    a.asset_id, 
    b.status, 
    a.name, 
    u.username, 
    b.borrow_date, 
    b.return_date  
FROM borrowrequests b
JOIN assets a ON a.asset_id = b.asset_id
JOIN users u ON u.user_id = b.student_id
WHERE b.student_id = ?

    `;

    con.query(sql, [studentId], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        if (result.length > 0) {
            res.status(200).json(result); // Return history as JSON
        } else {
            res.status(404).send('No borrowing request found for this student');
        }
    });
});
// Cancel request
app.put('/borrow-request/:request_id/cancel', function (req, res) {
    const request_ID = req.params.request_id;

    // Step 1: Get asset_id from the borrow request
    const getAssetIdSQL = `SELECT asset_id FROM borrowrequests WHERE request_id = ?`;

    con.query(getAssetIdSQL, [request_ID], function (err, results) {
        if (err) {
            console.error("Error fetching asset_id:", err);
            return res.status(500).send('Failed to fetch asset_id');
        }

        if (results.length === 0) {
            return res.status(404).send('Borrow request not found');
        }

        const asset_id = results[0].asset_id;

        // Step 2: Update the request status to 'rejected'
        const updateRequestSQL = `UPDATE borrowrequests SET status = 'canceled' WHERE request_id = ?`;

        con.query(updateRequestSQL, [request_ID], function (err2, result) {
            if (err2) {
                console.error("Error updating request:", err2);
                return res.status(500).send('Failed to update request status');
            }

            // Step 3: Update the asset status to 'available'
            const updateAssetStatus = `UPDATE assets SET status = 'available' WHERE asset_id = ?`;

            con.query(updateAssetStatus, [asset_id], function (err3) {
                if (err3) {
                    console.error("Error updating asset status:", err3);
                    return res.status(500).send('Request canceled but failed to update asset status');
                }

                res.status(200).json({ message: 'Request canceled and asset status updated' });
            });
        });
    });
});



// Reject borrow request (lecturer)
app.put('/borrow-request/:id/reject', (req, res) => {
    const requestId = req.params.id;
    const approverId = req.session.userID;

    const updateRequestSQL = `UPDATE borrowrequests SET status = 'rejected' WHERE request_id = ?`;
    const insertApprovalSQL = `INSERT INTO approvals (request_id, approver_id, approval_status, approval_date) VALUES (?, ?, 'rejected', NOW())`;

    con.query(updateRequestSQL, [requestId], (err, result) => {
        if (err) return res.status(500).send('Error rejecting request');

        con.query(insertApprovalSQL, [requestId, approverId], (err2) => {
            if (err2) return res.status(500).send('Error inserting into approvals table');
  //  UPDATE THE ASSET STATUS TO 'Available' HERE:
  const updateAssetStatus = `UPDATE assets SET status = 'available' WHERE asset_id = ?`;
  con.query(updateAssetStatus, [asset_id], function (err2) {
      if (err2) {
          console.error('Error updating asset status:', err2);
          return res.status(500).send('Rejected but failed to update asset status');
      }
      res.status(201).json({ message: 'Rejected and asset status updated' });
  });
            res.status(200).send('Request rejected and recorded');
        });
    });
});
app.post('/addHistory/:request_id', function (req, res) {
    const requestID = req.params.request_id;
    const { asset_id, student_id, approver_id } = req.body;

    const checkSql = `
        SELECT * FROM borrowrequests
        WHERE request_id = ? AND status = 'approved' AND history_added = FALSE
    `;

    con.query(checkSql, [requestID], function (err, results) {
        if (err) return res.status(500).send('Error checking borrow request');

        if (results.length === 0) {
            return res.status(409).json({ message: 'History already exists or request is invalid' });
        }

        const insertSql = `
            INSERT INTO history (asset_id, student_id, borrow_date, return_date, status, approver_id)
            SELECT asset_id, student_id, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'borrowed', ?
            FROM borrowrequests
            WHERE request_id = ? AND status = 'approved'
            LIMIT 1;
        `;

        con.query(insertSql, [approver_id, requestID], function (err, result) {
            if (err) return res.status(500).send('Error adding history');

            const updateSql = `UPDATE borrowrequests SET history_added = TRUE WHERE request_id = ?`;
            con.query(updateSql, [requestID], function (err) {
                if (err) return res.status(500).send('History added, but failed to update flag');

                res.status(200).json({ message: 'History added successfully', result });
            });
        });
    });
});

//=======================================Approval table=============================================
//Approval page

app.get('/approvals', async (req, res) => {
    try {
        const [result] = await con.promise().query(
            `SELECT 
                a.approval_id, 
                r.asset_id, 
                a2.name AS asset_name, 
                a.approver_id, 
                a.approval_status, 
                a.approval_date, 
                u.username AS approved_by
             FROM approvals a
             JOIN borrowrequests r ON a.request_id = r.request_id
             JOIN assets a2 ON r.asset_id = a2.asset_id
             JOIN users u ON a.approver_id = u.user_id
             WHERE a.approval_status IN ('approved', 'rejected')`
        );
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/approvalsRequests', (req, res) => {
    const sql = `
      SELECT 
          br.request_id,
          a.asset_id,
          a.name AS asset_name,
          u.full_name AS borrower,
          br.borrow_date,
          br.return_date,
          br.status AS request_status
      FROM borrowrequests br
      JOIN assets a ON br.asset_id = a.asset_id
      JOIN users u ON br.student_id = u.user_id
      WHERE br.status = 'pending'
    `;
  
    con.query(sql, (err, result) => {
      if (err) {
        console.error('Error fetching pending approvals:', err);
        return res.status(500).send('Internal Server Error');
      }
      res.status(200).json(result);
    });
  });
  


//=======================================Pages=============================================
//Student page
//Assetlist Student page
app.get('/welcome/Student', function (req, res) {
    if(req.session.userID == null){
      return  res.redirect( '/');
    }
    res.sendFile(path.join(__dirname, 'views/Student/asset_list.html'));
});
//Assetdetail
app.get('/detail', function (req, res) {
    if(req.session.userID == null){
        return  res.redirect( '/');
      }
    res.sendFile(path.join(__dirname, 'views/asset_detail.html'));
});
//History Student page
app.get('/hist/Student', function (req, res) {
    if(req.session.userID == null){
        return  res.redirect( '/');
      }
    res.sendFile(path.join(__dirname, 'views/Student/History.html'));
});
//Pending Student page
app.get('/pending/Student', function (req, res) {
    if(req.session.userID == null){
        return  res.redirect( '/');
      }
    res.sendFile(path.join(__dirname, 'views/Student/pending.html'));
});
//Lecturer page
//Assetlist Lecturer page
app.get('/welcome/Lecturer', function (req, res) {
    if(req.session.userID == null){
        return  res.redirect( '/');
      }
    res.sendFile(path.join(__dirname, 'views/Lecturer/asset_list.html'));
});
//Asset detail lecturer
app.get('/lecturer/detail', function (req, res) {
    if(req.session.userID == null){
        return  res.redirect( '/');
      }
    res.sendFile(path.join(__dirname, 'views/Lecturer/asset_detail.html'));
});
//Dashboard Lecturer page
app.get('/dash/Lecturer', function (req, res) {
    if(req.session.userID == null){
        return  res.redirect( '/');
      }
    res.sendFile(path.join(__dirname, 'views/Lecturer/dashboard.html'));
});
//Pending Lecturer page
app.get('/pending/Lecturer', function (req, res) {
    if(req.session.userID == null){
        return  res.redirect( '/');
      }
    res.sendFile(path.join(__dirname, 'views/Lecturer/pending.html'));
});
//Staff page
//Assetlist Staff page
app.get('/welcome/Staff', function (req, res) {
    if(req.session.userID == null){
        return  res.redirect( '/');
      }
    res.sendFile(path.join(__dirname, 'views/Staff/asset_list.html'));
});
//Dashboard Staff page
app.get('/dash/Staff', function (req, res) {
    if(req.session.userID == null){
        return  res.redirect( '/');
      }
    res.sendFile(path.join(__dirname, 'views/Staff/dashboard.html'));
});
//Pending Staff page
app.get('/pending/Staff', function (req, res) {
    if(req.session.userID == null){
        return  res.redirect( '/');
      }
    res.sendFile(path.join(__dirname, 'views/Staff/pending.html'));
});
// root service
app.get('/', function (req, res) {
   if(req.session.userRole == "Student"){
return res.redirect('/welcome/Student');
   }
   else if(req.session.userRole == 'Lecturer'){
    return res.redirect('/welcome/Lecturer');
   }
   else if(req.session.userRole == 'Staff'){
    return res.redirect('/welcome/Staff');
   }
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

const PORT = 3000;
app.listen(PORT, function () {
    console.log(`Server is running on port${PORT}`)
});