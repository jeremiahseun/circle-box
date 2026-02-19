package com.circlebox.sample

import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.circlebox.sdk.CircleBox
import com.circlebox.sdk.CircleBoxConfig

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        CircleBox.start(CircleBoxConfig(enableDebugViewer = true))

        findViewById<Button>(R.id.btnThermal).setOnClickListener {
            CircleBox.breadcrumb("Mock thermal spike", mapOf("state" to "critical"))
        }

        findViewById<Button>(R.id.btnBattery).setOnClickListener {
            CircleBox.breadcrumb("Mock low battery", mapOf("percent" to "7", "low_power_mode" to "true"))
        }

        findViewById<Button>(R.id.btnNetwork).setOnClickListener {
            CircleBox.breadcrumb("Mock no internet", mapOf("to" to "none"))
        }

        findViewById<Button>(R.id.btnPermission).setOnClickListener {
            CircleBox.breadcrumb("Mock permission revoked", mapOf("permission" to "camera", "to" to "denied"))
        }

        findViewById<Button>(R.id.btnDisk).setOnClickListener {
            CircleBox.breadcrumb("Mock low disk", mapOf("available_bytes" to "1024"))
        }

        findViewById<Button>(R.id.btnBreadcrumb).setOnClickListener {
            CircleBox.breadcrumb("User started Checkout", mapOf("flow" to "checkout"))
        }

        findViewById<Button>(R.id.btnExport).setOnClickListener {
            val files = CircleBox.exportLogs()
            Toast.makeText(this, "Exported ${files.size} file(s)", Toast.LENGTH_SHORT).show()
        }

        findViewById<Button>(R.id.btnViewer).setOnClickListener {
            val events = CircleBox.debugSnapshot(200)
            val body = if (events.isEmpty()) {
                "No events captured (enableDebugViewer=false or empty buffer)"
            } else {
                events.joinToString("\n") { event ->
                    "#${event.seq} ${event.type} [${event.severity.name.lowercase()}] ${event.attrs}"
                }
            }
            AlertDialog.Builder(this)
                .setTitle("CircleBox Viewer")
                .setMessage(body)
                .setPositiveButton("Close", null)
                .show()
        }

        findViewById<Button>(R.id.btnCrash).setOnClickListener {
            val crash = 1 / 0
            Toast.makeText(this, crash.toString(), Toast.LENGTH_SHORT).show()
        }
    }

    override fun onResume() {
        super.onResume()
        if (CircleBox.hasPendingCrashReport()) {
            AlertDialog.Builder(this)
                .setTitle("Crash Report Found")
                .setMessage("A pending .circlebox report exists from previous crash. Export now?")
                .setPositiveButton("Export") { _, _ ->
                    val files = CircleBox.exportLogs()
                    Toast.makeText(this, "Exported ${files.size} file(s)", Toast.LENGTH_SHORT).show()
                }
                .setNegativeButton("Later", null)
                .show()
        }
    }
}
