const PurchaseOrder = require('../models/PurchaseOrder');
const { pool } = require('../../db');
const { body, validationResult } = require('express-validator');
const { format } = require('date-fns');

class PurchaseOrderController {
  constructor() {
    // Use the shared pool instance from db.js instead of creating a new one
    this.pool = pool;
  }

  async getAllPurchaseOrders(req, res) {
    try {
      const result = await this.pool.query(`
        SELECT po.*, s.name as supplier_name, s.address as supplier_address, 
               s.email as supplier_email, s.phone as supplier_phone
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
        ORDER BY po.created_at DESC
      `);
      console.log(`Found ${result.rows.length} purchase orders`);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      res.status(500).send('Error fetching purchase orders');
    }
  }

  async getPurchaseOrderById(req, res) {
    const { id } = req.params;
    
    try {
      const poResult = await this.pool.query(`
        SELECT po.*, s.name as supplier_name, s.contact_name, s.email, s.phone, s.address
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
        WHERE po.po_id = $1
      `, [id]);

      if (poResult.rows.length === 0) {
        return res.status(404).send('Purchase order not found');
      }

      // Get the purchase order items
      const itemsResult = await this.pool.query(`
        SELECT poi.*, p.name as part_name, p.manufacturer_part_number, p.fiserv_part_number
        FROM purchase_order_items poi
        LEFT JOIN parts p ON poi.part_id = p.part_id
        WHERE poi.po_id = $1
      `, [id]);

      // Combine the results
      const purchaseOrder = {
        ...poResult.rows[0],
        items: itemsResult.rows
      };
      
      // Parse the notes field to add virtual priority and shipping fields
      if (purchaseOrder.notes) {
        const isUrgentMatch = purchaseOrder.notes.match(/\[PRIORITY:\s*(urgent|normal)\]/i);
        const nextDayAirMatch = purchaseOrder.notes.match(/\[SHIPPING:\s*(nextday|regular)\]/i);
        
        // Add virtual fields to the response
        purchaseOrder.is_urgent = isUrgentMatch ? isUrgentMatch[1].toLowerCase() === 'urgent' : false;
        purchaseOrder.priority = isUrgentMatch ? isUrgentMatch[1].toLowerCase() : 'normal';
        purchaseOrder.next_day_air = nextDayAirMatch ? nextDayAirMatch[1].toLowerCase() === 'nextday' : false;
      } else {
        purchaseOrder.is_urgent = false;
        purchaseOrder.priority = 'normal';
        purchaseOrder.next_day_air = false;
      }

      res.json(purchaseOrder);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error fetching purchase order');
    }
  }

  async createPurchaseOrder(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      supplier_id,
      notes,
      items,
      po_number: customPoNumber
    } = req.body;

    // Start a transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      let poNumber;
      
      // Use custom PO number if provided, otherwise generate one
      if (customPoNumber && customPoNumber.trim()) {
        // Check if the PO number already exists
        const existingPoResult = await client.query(
          "SELECT po_number FROM purchase_orders WHERE po_number = $1",
          [customPoNumber.trim()]
        );
        
        if (existingPoResult.rows.length > 0) {
          throw new Error('Purchase order number already exists');
        }
        
        poNumber = customPoNumber.trim();
      } else {
        // Generate a unique PO number (Year-Month-SequentialNumber)
        const currentDate = new Date();
        const poPrefix = format(currentDate, 'yyyyMM');
        
        // Get the latest PO number with this prefix
        const poNumResult = await client.query(
          "SELECT po_number FROM purchase_orders WHERE po_number LIKE $1 ORDER BY po_number DESC LIMIT 1",
          [`${poPrefix}%`]
        );
        
        let nextNum = 1;
        if (poNumResult.rows.length > 0) {
          // Extract the last number and increment
          const lastPO = poNumResult.rows[0].po_number;
          const lastNum = parseInt(lastPO.split('-')[1]);
          nextNum = lastNum + 1;
        }
        
        poNumber = `${poPrefix}-${nextNum.toString().padStart(4, '0')}`;
      }
      
      // Calculate the total amount
      let totalAmount = 0;
      for (const item of items) {
        totalAmount += parseFloat(item.quantity) * parseFloat(item.unit_price || 0);
      }
      
      // Ensure totalAmount is a valid number
      totalAmount = parseFloat(totalAmount.toFixed(2));
      
      // Create the purchase order
      const poResult = await client.query(
        `INSERT INTO purchase_orders (po_number, supplier_id, notes, total_amount) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [poNumber, supplier_id, notes, totalAmount]
      );
      
      const poId = poResult.rows[0].po_id;
      
      // Add the items
      for (const item of items) {
        const totalPrice = parseFloat(item.quantity) * parseFloat(item.unit_price || 0);
        // Ensure totalPrice is a valid number
        const formattedTotalPrice = parseFloat(totalPrice.toFixed(2));
        
        await client.query(
          `INSERT INTO purchase_order_items (po_id, part_id, quantity, unit_price, total_price) 
           VALUES ($1, $2, $3, $4, $5)`,
          [poId, item.part_id, item.quantity, item.unit_price, formattedTotalPrice]
        );
      }
      
      await client.query('COMMIT');
      
      // Get the complete purchase order with items
      const completePO = await this.getPurchaseOrderWithItems(poId);
      
      res.status(201).json(completePO);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      res.status(500).send('Error creating purchase order');
    } finally {
      client.release();
    }
  }
  
  async getPurchaseOrderWithItems(poId) {
    const poResult = await this.pool.query(`
      SELECT po.*, s.name as supplier_name, s.contact_name, s.email, s.phone, s.address
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
      WHERE po.po_id = $1
    `, [poId]);
    
    if (poResult.rows.length === 0) {
      return null;
    }
    
    const po = poResult.rows[0];
    
    // Get purchase order items
    const itemsResult = await this.pool.query(`
      SELECT poi.*, p.name as part_name, p.fiserv_part_number, p.manufacturer_part_number
      FROM purchase_order_items poi
      LEFT JOIN parts p ON poi.part_id = p.part_id
      WHERE poi.po_id = $1
    `, [poId]);
    
    po.items = itemsResult.rows;
    
    // Make sure we have supplier_name for Excel export
    if (!po.supplier_name && po.supplier_id) {
      const supplierResult = await this.pool.query(
        'SELECT name FROM suppliers WHERE supplier_id = $1',
        [po.supplier_id]
      );
      
      if (supplierResult.rows.length > 0) {
        po.supplier_name = supplierResult.rows[0].name;
      }
    }
    
    return po;
  }

  async updatePurchaseOrderStatus(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const poId = parseInt(req.params.id);
    const { status } = req.body;

    try {
      const result = await this.pool.query(
        `UPDATE purchase_orders 
         SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE po_id = $2 RETURNING *`,
        [status, poId]
      );

      if (result.rows.length === 0) {
        return res.status(404).send('Purchase order not found');
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error updating purchase order status');
    }
  }

  async updatePurchaseOrder(req, res) {
    try {
      const poId = req.params.id;
      const updateData = req.body;
      
      // Get current purchase order data
      const result = await this.pool.query(
        'SELECT * FROM purchase_orders WHERE po_id = $1',
        [poId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: `Purchase order with ID ${poId} not found.`
        });
      }
      
      let notes = result.rows[0].notes || '';
      
      // If we're updating priority or shipping, update the notes
      if (updateData.hasOwnProperty('is_urgent') || updateData.hasOwnProperty('priority') || updateData.hasOwnProperty('next_day_air')) {
        // Parse existing flags from notes
        const isUrgentMatch = notes.match(/\[PRIORITY:\s*(urgent|normal)\]/i);
        const nextDayAirMatch = notes.match(/\[SHIPPING:\s*(nextday|regular)\]/i);
        
        let priority = isUrgentMatch ? isUrgentMatch[1].toLowerCase() : 'normal';
        let shipping = nextDayAirMatch ? nextDayAirMatch[1].toLowerCase() : 'regular';
        
        // Update with new values if provided
        if (updateData.hasOwnProperty('is_urgent')) {
          priority = updateData.is_urgent ? 'urgent' : 'normal';
        }
        
        if (updateData.hasOwnProperty('priority')) {
          priority = updateData.priority;
        }
        
        if (updateData.hasOwnProperty('next_day_air')) {
          shipping = updateData.next_day_air ? 'nextday' : 'regular';
        }
        
        // Remove existing flags
        notes = notes.replace(/\[PRIORITY:\s*(?:urgent|normal)\]/ig, '');
        notes = notes.replace(/\[SHIPPING:\s*(?:nextday|regular)\]/ig, '');
        
        // Add updated flags
        const flagsText = `[PRIORITY: ${priority}] [SHIPPING: ${shipping}]`;
        
        // If notes are empty or just whitespace, just use the flags
        if (!notes.trim()) {
          notes = flagsText;
        } else {
          // Otherwise add flags at the beginning
          notes = `${flagsText} ${notes.trim()}`;
        }
      }
      
      // Check for shipping_cost and tax_amount in the notes if we're updating those
      if (updateData.hasOwnProperty('shipping_cost') || updateData.hasOwnProperty('tax_amount')) {
        // Extract existing shipping cost and tax amount from notes if they exist
        const shippingMatch = notes.match(/\[SHIPPING_COST:\s*([\d.]+)\]/i);
        const taxMatch = notes.match(/\[TAX_AMOUNT:\s*([\d.]+)\]/i);
        
        // Remove existing shipping and tax notes
        notes = notes.replace(/\[SHIPPING_COST:\s*[\d.]+\]/ig, '');
        notes = notes.replace(/\[TAX_AMOUNT:\s*[\d.]+\]/ig, '');
        
        // Add updated shipping cost and tax amount
        if (updateData.hasOwnProperty('shipping_cost')) {
          notes = `${notes.trim()} [SHIPPING_COST: ${updateData.shipping_cost}]`;
        } else if (shippingMatch) {
          notes = `${notes.trim()} [SHIPPING_COST: ${shippingMatch[1]}]`;
        }
        
        if (updateData.hasOwnProperty('tax_amount')) {
          notes = `${notes.trim()} [TAX_AMOUNT: ${updateData.tax_amount}]`;
        } else if (taxMatch) {
          notes = `${notes.trim()} [TAX_AMOUNT: ${taxMatch[1]}]`;
        }
        
        notes = notes.trim();
      }
      
      // Try updating with the new fields first, fall back to notes-based approach if columns don't exist
      try {
        // Prepare the update query
        let updateFields = ['notes = $1'];
        let queryParams = [notes];
        let paramIndex = 2;
        
        // Check for shipping cost and tax amount updates
        if (updateData.hasOwnProperty('shipping_cost')) {
          updateFields.push(`shipping_cost = $${paramIndex}`);
          queryParams.push(updateData.shipping_cost);
          paramIndex++;
        }
        
        if (updateData.hasOwnProperty('tax_amount')) {
          updateFields.push(`tax_amount = $${paramIndex}`);
          queryParams.push(updateData.tax_amount);
          paramIndex++;
        }
        
        // Always update timestamp
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        
        // Add the PO ID parameter
        queryParams.push(poId);
        
        // Update the purchase order with the modified fields
        console.log(`Updating purchase order ${poId} with fields: ${updateFields.join(', ')}`);
        
        const result = await this.pool.query(
          `UPDATE purchase_orders 
           SET ${updateFields.join(', ')} 
           WHERE po_id = $${paramIndex} RETURNING *`,
          queryParams
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            error: `Unable to update purchase order with ID ${poId}.`
          });
        }
        
        return res.status(200).json({
          message: `Purchase order ${poId} updated successfully.`,
          purchase_order: result.rows[0]
        });
      } catch (error) {
        console.error('Error updating purchase order with new fields:', error);
        
        // If we get a column doesn't exist error (code 42703), fallback to only updating notes
        if (error.code === '42703') {
          console.log('Columns do not exist yet, falling back to notes-only update');
          
          const fallbackResult = await this.pool.query(
            `UPDATE purchase_orders 
             SET notes = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE po_id = $2 RETURNING *`,
            [notes, poId]
          );
          
          if (fallbackResult.rows.length === 0) {
            return res.status(404).json({
              error: `Unable to update purchase order with ID ${poId}.`
            });
          }
          
          return res.status(200).json({
            message: `Purchase order ${poId} updated successfully (using notes fallback).`,
            purchase_order: fallbackResult.rows[0]
          });
        } else {
          // For any other error, return the error
          throw error;
        }
      }
    } catch (error) {
      console.error('Error updating purchase order:', error);
      return res.status(500).json({
        error: `Error updating purchase order: ${error.message}`
      });
    }
  }

  async deletePurchaseOrder(req, res) {
    const poId = parseInt(req.params.id);

    // Start a transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete the purchase order items first (the cascade should handle this automatically, but being explicit)
      await client.query('DELETE FROM purchase_order_items WHERE po_id = $1', [poId]);
      
      // Delete the purchase order
      const result = await client.query(
        'DELETE FROM purchase_orders WHERE po_id = $1 RETURNING *',
        [poId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).send('Purchase order not found');
      }

      await client.query('COMMIT');
      res.json({ message: 'Purchase order deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      res.status(500).send('Error deleting purchase order');
    } finally {
      client.release();
    }
  }

  async generatePurchaseOrdersForParts(req, res) {
    // Get all parts that need to be ordered grouped by supplier
    try {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        // Check if custom PO numbers were provided
        const { parts, customPoNumbers } = req.body || {};
        
        // If parts were provided directly from the frontend, use them
        if (parts && Array.isArray(parts) && parts.length > 0) {
          console.log("Received parts from frontend:", parts);
          
          // Group parts by supplier
          const partsBySupplier = {};
          const TBD_SUPPLIER_KEY = '-1';
          
          // First pass - collect all parts with no supplier into the TBD group
          for (const part of parts) {
            if (!part.supplier_id) {
              if (!partsBySupplier[TBD_SUPPLIER_KEY]) {
                partsBySupplier[TBD_SUPPLIER_KEY] = {
                  supplier_id: null,
                  supplier_name: 'TBD',
                  parts: []
                };
              }
              
              // Get full part info
              const partResult = await client.query(
                'SELECT * FROM parts WHERE part_id = $1',
                [part.part_id]
              );
              
              if (partResult.rows.length === 0) {
                continue; // Skip if part not found
              }
              
              const fullPart = partResult.rows[0];
              
              // Check if the part already has a pending purchase order
              const existingPOCheck = await client.query(`
                SELECT po.po_id 
                FROM purchase_orders po
                JOIN purchase_order_items poi ON po.po_id = poi.po_id
                WHERE poi.part_id = $1 AND po.supplier_id IS NULL AND po.status = 'pending'
              `, [part.part_id]);
              
              // Skip if it already has a pending order
              if (existingPOCheck.rows.length > 0) {
                console.log(`Skipping part ${part.part_id} as it already has a pending purchase order in TBD group`);
                continue;
              }
              
              partsBySupplier[TBD_SUPPLIER_KEY].parts.push({
                part_id: fullPart.part_id,
                name: fullPart.name,
                manufacturer_part_number: fullPart.manufacturer_part_number,
                fiserv_part_number: fullPart.fiserv_part_number,
                current_quantity: fullPart.quantity,
                minimum_quantity: fullPart.minimum_quantity,
                order_quantity: part.quantity || Math.max((fullPart.minimum_quantity * 2) - fullPart.quantity, fullPart.minimum_quantity),
                unit_price: parseFloat(fullPart.unit_cost) || 0,
                lead_time_days: 0
              });
            }
          }
          
          // Second pass - process parts with suppliers
          for (const part of parts) {
            const supplierId = part.supplier_id;
            // Skip parts without suppliers (already handled in first pass)
            if (!supplierId) {
              continue;
            }
            
            // Check if part already has a pending purchase order
            const existingPOCheck = await client.query(`
              SELECT po.po_id 
              FROM purchase_orders po
              JOIN purchase_order_items poi ON po.po_id = poi.po_id
              WHERE poi.part_id = $1 AND po.supplier_id = $2 AND po.status = 'pending'
            `, [part.part_id, part.supplier_id]);
            
            // Skip this part if it already has a pending purchase order
            if (existingPOCheck.rows.length > 0) {
              console.log(`Skipping part ${part.part_id} as it already has a pending purchase order`);
              continue;
            }
            
            if (!partsBySupplier[supplierId]) {
              // Get supplier info
              const supplierResult = await client.query(
                'SELECT * FROM suppliers WHERE supplier_id = $1',
                [supplierId]
              );
              
              const supplier = supplierResult.rows[0] || { name: 'Unknown Supplier' };
              
              partsBySupplier[supplierId] = {
                supplier_id: supplierId,
                supplier_name: supplier.name,
                parts: []
              };
            }
            
            // Get full part info
            const partResult = await client.query(
              'SELECT * FROM parts WHERE part_id = $1',
              [part.part_id]
            );
            
            if (partResult.rows.length === 0) {
              continue; // Skip if part not found
            }
            
            const fullPart = partResult.rows[0];
            
            // Get supplier-specific info
            const supplierPartResult = await client.query(
              'SELECT * FROM part_suppliers WHERE part_id = $1 AND supplier_id = $2',
              [part.part_id, supplierId]
            );
            
            const supplierPart = supplierPartResult.rows[0] || {};
            
            partsBySupplier[supplierId].parts.push({
              part_id: fullPart.part_id,
              name: fullPart.name,
              manufacturer_part_number: fullPart.manufacturer_part_number,
              fiserv_part_number: fullPart.fiserv_part_number,
              current_quantity: fullPart.quantity,
              minimum_quantity: fullPart.minimum_quantity,
              order_quantity: part.quantity || Math.max((fullPart.minimum_quantity * 2) - fullPart.quantity, fullPart.minimum_quantity),
              unit_price: parseFloat(supplierPart.unit_cost || fullPart.unit_cost) || 0,
              lead_time_days: supplierPart.lead_time_days || 0
            });
          }
          
          // If no parts were grouped (e.g., all parts had invalid suppliers), return error
          if (Object.keys(partsBySupplier).length === 0) {
            return res.status(400).json({ message: 'No valid parts with suppliers found for reorder' });
          }
          
          // Create purchase orders for each supplier
          const createdPOs = [];
          const currentDate = new Date();
          const poPrefix = format(currentDate, 'yyyyMM');
          
          // Get the latest PO number with this prefix to start our sequence
          const nextPoNumberResult = await client.query(
            "SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num FROM purchase_orders WHERE po_number LIKE $1",
            [`${poPrefix}-%`]
          );
          
          let nextNum = 1;
          if (nextPoNumberResult.rows.length > 0) {
            nextNum = nextPoNumberResult.rows[0].next_num;
          }
          
          // Create POs for each supplier
          let supplierIndex = 0;
          for (const supplierId in partsBySupplier) {
            const supplierData = partsBySupplier[supplierId];
            
            // Determine PO number - use custom if provided, otherwise generate
            let poNumber;
            const supplierIdStr = supplierId.toString();
            
            if (customPoNumbers && customPoNumbers[supplierIdStr]) {
              // Check if the PO number already exists
              const customPoNum = customPoNumbers[supplierIdStr].trim();
              const existingPoResult = await client.query(
                "SELECT po_number FROM purchase_orders WHERE po_number = $1",
                [customPoNum]
              );
              
              if (existingPoResult.rows.length > 0) {
                throw new Error(`Purchase order number ${customPoNum} already exists`);
              }
              
              poNumber = customPoNum;
            } else {
              poNumber = `${poPrefix}-${nextNum.toString().padStart(4, '0')}`;
              nextNum++;
            }

            // Calculate total amount
            let totalAmount = 0;
            for (const part of supplierData.parts) {
              totalAmount += parseFloat(part.order_quantity) * parseFloat(part.unit_price || 0);
            }
            
            // Create the PO - handle special TBD case
            let poResult;
            if (supplierId === TBD_SUPPLIER_KEY) {
              // For TBD supplier, set supplier_id to null
              poResult = await client.query(
                `INSERT INTO purchase_orders (
                  po_number, supplier_id, status, total_amount, notes
                ) VALUES ($1, NULL, $2, $3, $4) RETURNING *`,
                [
                  poNumber,
                  'pending',
                  totalAmount,
                  'Auto-generated for parts without assigned supplier'
                ]
              );
            } else {
              // For regular suppliers
              poResult = await client.query(
                `INSERT INTO purchase_orders (
                  po_number, supplier_id, status, total_amount, notes
                ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [
                  poNumber,
                  supplierId,
                  'pending',
                  totalAmount,
                  'Auto-generated for low stock parts'
                ]
              );
            }
            
            const newPO = poResult.rows[0];
            
            // Add PO items
            for (const part of supplierData.parts) {
              await client.query(
                `INSERT INTO purchase_order_items (
                  po_id, part_id, quantity, unit_price, total_price
                ) VALUES ($1, $2, $3, $4, $5)`,
                [
                  newPO.po_id,
                  part.part_id,
                  part.order_quantity,
                  part.unit_price,
                  parseFloat((part.order_quantity * part.unit_price).toFixed(2))
                ]
              );
            }
            
            // Add supplier name for convenience
            newPO.supplier_name = supplierData.supplier_name;
            
            // Add items to return data
            const items = await client.query(
              `SELECT poi.*, p.name, p.fiserv_part_number, p.manufacturer_part_number
               FROM purchase_order_items poi
               JOIN parts p ON poi.part_id = p.part_id
               WHERE poi.po_id = $1`,
              [newPO.po_id]
            );
            
            newPO.items = items.rows;
            
            createdPOs.push(newPO);
            supplierIndex++;
          }
          
          await client.query('COMMIT');
          return res.json(createdPOs);
        } else {
          // Original implementation using backend logic to detect parts needing reorder
          // Find all parts that need to be ordered
          const partsToOrderResult = await client.query(`
            SELECT 
              p.*,
              ps.supplier_id,
              s.name as supplier_name,
              ps.unit_cost as supplier_unit_cost,
              ps.lead_time_days,
              ps.minimum_order_quantity,
              ps.is_preferred
            FROM parts p
            JOIN (
              SELECT DISTINCT ON (part_id) part_id, supplier_id, unit_cost, lead_time_days, minimum_order_quantity, is_preferred
              FROM part_suppliers
              ORDER BY part_id, is_preferred DESC, unit_cost ASC
            ) ps ON p.part_id = ps.part_id
            JOIN suppliers s ON ps.supplier_id = s.supplier_id
            WHERE (p.quantity <= p.minimum_quantity OR p.quantity = 0)
            ORDER BY ps.supplier_id
          `);

          if (partsToOrderResult.rows.length === 0) {
            return res.status(404).json({ message: 'No parts to reorder at this time.\nAll parts are currently above their minimum quantity levels.' });
          }

          // Group parts by supplier
          const partsBySupplier = {};
          const TBD_SUPPLIER_KEY = '-1';
          
          // First pass - collect all parts with no supplier into the TBD group
          for (const part of partsToOrderResult.rows) {
            if (!part.supplier_id) {
              if (!partsBySupplier[TBD_SUPPLIER_KEY]) {
                partsBySupplier[TBD_SUPPLIER_KEY] = {
                  supplier_id: null,
                  supplier_name: 'TBD',
                  parts: []
                };
              }
              
              // Check if the part already has a pending purchase order
              const existingPOCheck = await client.query(`
                SELECT po.po_id 
                FROM purchase_orders po
                JOIN purchase_order_items poi ON po.po_id = poi.po_id
                WHERE poi.part_id = $1 AND po.supplier_id IS NULL AND po.status = 'pending'
              `, [part.part_id]);
              
              // Skip if it already has a pending order
              if (existingPOCheck.rows.length > 0) {
                console.log(`Skipping part ${part.part_id} as it already has a pending purchase order in TBD group`);
                continue;
              }
              
              partsBySupplier[TBD_SUPPLIER_KEY].parts.push({
                part_id: part.part_id,
                name: part.name,
                manufacturer_part_number: part.manufacturer_part_number,
                fiserv_part_number: part.fiserv_part_number,
                current_quantity: part.quantity,
                minimum_quantity: part.minimum_quantity,
                order_quantity: Math.max(
                  Math.max(
                    (part.minimum_quantity * 2) - part.quantity,
                    part.minimum_quantity
                  ),
                  part.minimum_order_quantity || 1
                ),
                unit_price: parseFloat(part.unit_cost) || 0,
                lead_time_days: 0
              });
            }
          }
          
          // Second pass - process parts with suppliers
          for (const part of partsToOrderResult.rows) {
            const supplierId = part.supplier_id;
            // Skip parts without suppliers (already handled in first pass)
            if (!supplierId) {
              continue;
            }
            
            // Check if part already has a pending purchase order
            const existingPOCheck = await client.query(`
              SELECT po.po_id 
              FROM purchase_orders po
              JOIN purchase_order_items poi ON po.po_id = poi.po_id
              WHERE poi.part_id = $1 AND po.supplier_id = $2 AND po.status = 'pending'
            `, [part.part_id, part.supplier_id]);
            
            // Skip this part if it already has a pending purchase order
            if (existingPOCheck.rows.length > 0) {
              console.log(`Skipping part ${part.part_id} as it already has a pending purchase order`);
              continue;
            }
            
            if (!partsBySupplier[supplierId]) {
              partsBySupplier[supplierId] = {
                supplier_id: supplierId,
                supplier_name: part.supplier_name,
                parts: []
              };
            }
            
            // Calculate order quantity (2x minimum_quantity - current quantity)
            // This ensures we order enough to get above the minimum threshold
            const minimumOrderQuantity = part.minimum_order_quantity || 1;
            const orderQuantity = Math.max(
              Math.max(
                (part.minimum_quantity * 2) - part.quantity,
                part.minimum_quantity
              ),
              minimumOrderQuantity
            );
            
            partsBySupplier[supplierId].parts.push({
              part_id: part.part_id,
              name: part.name,
              manufacturer_part_number: part.manufacturer_part_number,
              fiserv_part_number: part.fiserv_part_number,
              current_quantity: part.quantity,
              minimum_quantity: part.minimum_quantity,
              order_quantity: orderQuantity,
              unit_price: parseFloat(part.supplier_unit_cost || part.unit_cost) || 0,
              lead_time_days: part.lead_time_days || 0
            });
          }

          // Create purchase orders for each supplier
          const createdPOs = [];
          const currentDate = new Date();
          const poPrefix = format(currentDate, 'yyyyMM');
          
          // Get the latest PO number with this prefix to start our sequence
          const nextPoNumberResult = await client.query(
            "SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num FROM purchase_orders WHERE po_number LIKE $1",
            [`${poPrefix}-%`]
          );
          
          let nextNum = 1;
          if (nextPoNumberResult.rows.length > 0) {
            nextNum = nextPoNumberResult.rows[0].next_num;
          }

          let supplierIndex = 0;
          for (const supplierId in partsBySupplier) {
            const supplierData = partsBySupplier[supplierId];
            
            // Determine PO number - use custom if provided, otherwise generate
            let poNumber;
            
            if (customPoNumbers && customPoNumbers[supplierIndex]) {
              // Check if the PO number already exists
              const existingPoResult = await client.query(
                "SELECT po_number FROM purchase_orders WHERE po_number = $1",
                [customPoNumbers[supplierIndex].trim()]
              );
              
              if (existingPoResult.rows.length > 0) {
                throw new Error('Purchase order number already exists');
              }
              
              poNumber = customPoNumbers[supplierIndex].trim();
            } else {
              poNumber = `${poPrefix}-${nextNum.toString().padStart(4, '0')}`;
              nextNum++;
            }

            // Calculate total amount
            let totalAmount = 0;
            for (const part of supplierData.parts) {
              totalAmount += parseFloat(part.order_quantity) * parseFloat(part.unit_price || 0);
            }
            
            // Create the PO - handle special TBD case
            let poResult;
            if (supplierId === TBD_SUPPLIER_KEY) {
              // For TBD supplier, set supplier_id to null
              poResult = await client.query(
                `INSERT INTO purchase_orders (
                  po_number, supplier_id, status, total_amount, notes
                ) VALUES ($1, NULL, $2, $3, $4) RETURNING *`,
                [
                  poNumber,
                  'pending',
                  totalAmount,
                  'Auto-generated for parts without assigned supplier'
                ]
              );
            } else {
              // For regular suppliers
              poResult = await client.query(
                `INSERT INTO purchase_orders (
                  po_number, supplier_id, status, total_amount, notes
                ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [
                  poNumber,
                  supplierId,
                  'pending',
                  totalAmount,
                  'Auto-generated for low stock parts'
                ]
              );
            }
            
            const newPO = poResult.rows[0];
            
            // Add PO items
            for (const part of supplierData.parts) {
              await client.query(
                `INSERT INTO purchase_order_items (
                  po_id, part_id, quantity, unit_price, total_price
                ) VALUES ($1, $2, $3, $4, $5)`,
                [
                  newPO.po_id,
                  part.part_id,
                  part.order_quantity,
                  part.unit_price,
                  parseFloat((part.order_quantity * part.unit_price).toFixed(2))
                ]
              );
            }
            
            // Add supplier name for convenience
            newPO.supplier_name = supplierData.supplier_name;
            
            // Add items to return data
            const items = await client.query(
              `SELECT poi.*, p.name, p.fiserv_part_number, p.manufacturer_part_number
               FROM purchase_order_items poi
               JOIN parts p ON poi.part_id = p.part_id
               WHERE poi.po_id = $1`,
              [newPO.po_id]
            );
            
            newPO.items = items.rows;
            
            createdPOs.push(newPO);
            supplierIndex++;
          }
          
          await client.query('COMMIT');
          res.status(201).json({
            message: `Successfully generated ${createdPOs.length} purchase orders`,
            purchase_orders: createdPOs
          });
        }
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).send(`Error generating purchase orders: ${error.message}`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('Error generating purchase orders');
    }
  }

  getValidationRules() {
    return [
      body('supplier_id').isInt().withMessage('Supplier ID must be an integer'),
      body('items').isArray().withMessage('Items must be an array'),
      body('items.*.part_id').isInt().withMessage('Part ID must be an integer'),
      body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
      body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number')
    ];
  }
}

module.exports = PurchaseOrderController;
