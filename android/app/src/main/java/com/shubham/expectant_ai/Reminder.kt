package com.shubham.expectant_ai

data class Reminder(
    val id: String,
    val title: String,
    val message: String,
    val scheduledAtMillis: Long
)
