package it.yesmobility.rubrica

import android.content.ContentProviderOperation
import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.provider.ContactsContract

data class Lead(val nome: String, val cognome: String, val telefono: String, val email: String) {
    val nomeCompleto: String get() = listOf(nome, cognome).filter { it.isNotBlank() }.joinToString(" ")
}

object Contatti {
    const val ETICHETTA = "YesMobility"

    /** +39 se manca il prefisso, tolti spazi e simboli. */
    fun normalizza(numero: String): String {
        var n = numero.filter { it.isDigit() || it == '+' }
        if (n.startsWith("00")) n = "+" + n.substring(2)
        if (!n.startsWith("+") && n.length >= 9) n = "+39$n"
        return n
    }

    private fun esiste(c: Context, numero: String): Boolean {
        val uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(numero))
        c.contentResolver.query(uri, arrayOf(ContactsContract.PhoneLookup._ID), null, null, null)?.use {
            return it.count > 0
        }
        return false
    }

    /** Cerca l'etichetta "YesMobility" tra i contatti locali del telefono; la crea se manca. */
    private fun idGruppo(c: Context): Long {
        c.contentResolver.query(
            ContactsContract.Groups.CONTENT_URI,
            arrayOf(ContactsContract.Groups._ID),
            "${ContactsContract.Groups.TITLE}=? AND ${ContactsContract.Groups.ACCOUNT_TYPE} IS NULL AND ${ContactsContract.Groups.DELETED}=0",
            arrayOf(ETICHETTA), null
        )?.use { if (it.moveToFirst()) return it.getLong(0) }
        val v = ContentValues().apply {
            put(ContactsContract.Groups.TITLE, ETICHETTA)
            put(ContactsContract.Groups.GROUP_VISIBLE, 1)
        }
        val uri = c.contentResolver.insert(ContactsContract.Groups.CONTENT_URI, v)
        return uri?.lastPathSegment?.toLongOrNull() ?: -1L
    }

    /** @return true se il contatto è stato creato, false se il numero era già in rubrica. */
    fun salva(c: Context, lead: Lead): Boolean {
        val numero = normalizza(lead.telefono)
        if (esiste(c, numero)) return false
        val gruppo = idGruppo(c)
        val ops = ArrayList<ContentProviderOperation>()
        ops.add(
            ContentProviderOperation.newInsert(ContactsContract.RawContacts.CONTENT_URI)
                .withValue(ContactsContract.RawContacts.ACCOUNT_TYPE, null)
                .withValue(ContactsContract.RawContacts.ACCOUNT_NAME, null)
                .build()
        )
        ops.add(
            ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME, lead.nome)
                .withValue(ContactsContract.CommonDataKinds.StructuredName.FAMILY_NAME, lead.cognome)
                .build()
        )
        ops.add(
            ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, numero)
                .withValue(ContactsContract.CommonDataKinds.Phone.TYPE, ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE)
                .build()
        )
        if (lead.email.isNotBlank()) {
            ops.add(
                ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                    .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Email.CONTENT_ITEM_TYPE)
                    .withValue(ContactsContract.CommonDataKinds.Email.ADDRESS, lead.email)
                    .withValue(ContactsContract.CommonDataKinds.Email.TYPE, ContactsContract.CommonDataKinds.Email.TYPE_WORK)
                    .build()
            )
        }
        ops.add(
            ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Organization.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.Organization.COMPANY, ETICHETTA)
                .build()
        )
        if (gruppo > 0) {
            ops.add(
                ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                    .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.GroupMembership.CONTENT_ITEM_TYPE)
                    .withValue(ContactsContract.CommonDataKinds.GroupMembership.GROUP_ROW_ID, gruppo)
                    .build()
            )
        }
        c.contentResolver.applyBatch(ContactsContract.AUTHORITY, ops)
        return true
    }
}
